import { Inject, Injectable } from '@nestjs/common';
import { Prisma, VerificationRequest, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PropertiesService } from '../properties/properties.service';
import {
  BadRequestAppException,
  ForbiddenAppException,
  NotFoundAppException,
} from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import {
  MAX_DOCUMENT_SIZE_BYTES,
  PresignedUpload,
  STORAGE_PROVIDER,
  StorageProvider,
} from '../files/storage.interface';
import { AuditService } from '../audit/audit.service';
import { EventBus } from '../events/event-bus';
import { DomainEvent } from '../events/events';
import { CreateVerificationDto, RequestUploadUrlDto } from './dto/verification.dto';

/**
 * Owns resident verification. Documents live only in private object storage;
 * this service persists storage keys (never public URLs) and exposes signed
 * download URLs ONLY to moderators/admins. When a verification is approved, the
 * linked review (if any) is flagged verified so the public surface can show a
 * "Verified Resident" badge — without ever exposing the evidence.
 */
@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly properties: PropertiesService,
    private readonly audit: AuditService,
    private readonly events: EventBus,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /**
   * Issues a presigned upload URL scoped to the requesting user. The returned
   * `key` is what the client later references when creating the verification
   * request — the client never chooses its own key.
   */
  async requestUploadUrl(userId: string, dto: RequestUploadUrlDto): Promise<PresignedUpload> {
    if (dto.sizeBytes > MAX_DOCUMENT_SIZE_BYTES) {
      throw new BadRequestAppException('File exceeds the maximum size.', ErrorCode.FILE_TOO_LARGE);
    }
    return this.storage.createPresignedUpload({
      keyPrefix: `verification/${userId}`,
      contentType: dto.contentType,
      maxSizeBytes: dto.sizeBytes,
    });
  }

  /**
   * Creates a verification request with its documents. Each referenced storage
   * key must belong to this user's namespace — preventing a caller from
   * attaching someone else's uploaded object.
   */
  async create(userId: string, dto: CreateVerificationDto): Promise<VerificationRequest> {
    const property = await this.properties.getById(dto.propertyId);

    const prefix = `verification/${userId}/`;
    for (const doc of dto.documents) {
      if (!doc.storageKey.startsWith(prefix)) {
        throw new ForbiddenAppException('Document key does not belong to you.');
      }
      await this.storage.assertUploadedDocument(doc.storageKey, doc.contentType, doc.sizeBytes);
    }

    if (dto.reviewId) {
      const review = await this.prisma.review.findFirst({
        where: { id: dto.reviewId, authorId: userId, deletedAt: null },
        select: { id: true, propertyId: true },
      });
      if (!review) {
        throw new NotFoundAppException('Review not found', ErrorCode.REVIEW_NOT_FOUND);
      }
      let reviewPropertyId: string;
      try {
        reviewPropertyId = (await this.properties.getById(review.propertyId)).id;
      } catch {
        throw new NotFoundAppException('Review not found', ErrorCode.REVIEW_NOT_FOUND);
      }
      if (reviewPropertyId !== property.id) {
        throw new NotFoundAppException('Review not found', ErrorCode.REVIEW_NOT_FOUND);
      }
    }

    const request = await this.prisma.verificationRequest.create({
      data: {
        userId,
        propertyId: property.id,
        reviewId: dto.reviewId ?? null,
        evidenceType: dto.evidenceType,
        status: VerificationStatus.PENDING,
        documents: {
          create: dto.documents.map((d) => ({
            storageKey: d.storageKey,
            contentType: d.contentType,
            sizeBytes: d.sizeBytes,
          })),
        },
      },
    });

    await this.audit.record({
      actorId: userId,
      action: 'VERIFICATION_REQUESTED',
      entityType: 'VerificationRequest',
      entityId: request.id,
    });

    return request;
  }

  /** Returns the status-only view for the requesting owner (no document URLs). */
  async getMyRequest(userId: string, id: string) {
    const request = await this.prisma.verificationRequest.findFirst({
      where: { id, userId },
      include: { documents: { select: { id: true, contentType: true, sizeBytes: true } } },
    });
    if (!request) {
      throw new NotFoundAppException('Verification not found', ErrorCode.VERIFICATION_NOT_FOUND);
    }
    // Deliberately omit storageKey — even the owner gets no document URL here.
    return {
      id: request.id,
      propertyId: request.propertyId,
      reviewId: request.reviewId,
      status: request.status,
      evidenceType: request.evidenceType,
      rejectionReason: request.rejectionReason,
      createdAt: request.createdAt,
      documentCount: request.documents.length,
    };
  }

  listMine(userId: string) {
    return this.prisma.verificationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        propertyId: true,
        reviewId: true,
        status: true,
        evidenceType: true,
        createdAt: true,
      },
    });
  }

  /**
   * Moderator/admin decision. On VERIFIED, flags the linked review (if any) as
   * verified. All document access and decisions are audit-logged.
   */
  async decide(
    reviewerId: string,
    id: string,
    decision: 'VERIFIED' | 'REJECTED',
    rejectionReason?: string,
  ): Promise<VerificationRequest> {
    const request = await this.prisma.verificationRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundAppException('Verification not found', ErrorCode.VERIFICATION_NOT_FOUND);
    }
    if (request.status !== VerificationStatus.PENDING) {
      throw new BadRequestAppException(
        'Only pending verifications can be decided.',
        ErrorCode.INVALID_VERIFICATION,
      );
    }

    const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const result = await tx.verificationRequest.update({
        where: { id },
        data: {
          status: decision as VerificationStatus,
          reviewerId,
          decidedAt: new Date(),
          rejectionReason: decision === 'REJECTED' ? (rejectionReason ?? null) : null,
        },
      });
      if (decision === 'VERIFIED' && request.reviewId) {
        await tx.review.update({
          where: { id: request.reviewId },
          data: { isVerified: true },
        });
      }
      return result;
    });

    await this.audit.record({
      actorId: reviewerId,
      action: decision === 'VERIFIED' ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED',
      entityType: 'VerificationRequest',
      entityId: id,
      metadata: { decision },
    });

    if (decision === 'VERIFIED' && request.reviewId) {
      await this.events.emit(DomainEvent.REVIEW_VERIFIED, {
        reviewId: request.reviewId,
        propertyId: request.propertyId,
      });
    }

    return updated;
  }

  /**
   * Admin/moderator-only: issue a short-lived signed download URL for a
   * document. Access is audit-logged. Never reachable from public APIs.
   */
  async getDocumentDownloadUrl(reviewerId: string, documentId: string) {
    const doc = await this.prisma.verificationDocument.findUnique({ where: { id: documentId } });
    if (!doc) {
      throw new NotFoundAppException('Document not found', ErrorCode.NOT_FOUND);
    }
    const signed = await this.storage.createPresignedDownload(doc.storageKey);
    await this.audit.record({
      actorId: reviewerId,
      action: 'VERIFICATION_DOCUMENT_ACCESSED',
      entityType: 'VerificationDocument',
      entityId: documentId,
    });
    return signed;
  }

  /** Admin queue of pending verifications with document metadata (no URLs). */
  listPending() {
    return this.prisma.verificationRequest.findMany({
      where: { status: VerificationStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      include: {
        documents: { select: { id: true, contentType: true, sizeBytes: true } },
      },
    });
  }
}
