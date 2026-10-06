import { Inject, Injectable } from '@nestjs/common';
import {
  ClaimRole,
  ClaimStatus,
  OwnerResponse,
  PropertyClaim,
  ReviewStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PropertiesService } from '../properties/properties.service';
import { AuditService } from '../audit/audit.service';
import { EventBus } from '../events/event-bus';
import { DomainEvent } from '../events/events';
import {
  BadRequestAppException,
  ConflictAppException,
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
import { CreateClaimDto, OwnerResponseDto } from './dto/claim.dto';

/**
 * Property claims and owner responses.
 *
 * Claim flow: a user uploads evidence and requests OWNER/MANAGER status; an
 * admin approves, which marks the property claimed, grants the user the
 * matching role (least-privilege: only the one they claimed), and links them to
 * the property. Owner responses are a strictly bounded power: a verified owner
 * may ADD a public, clearly-labelled response to a review. They can never edit
 * or delete the review, suppress it, or learn the reviewer's identity.
 */
@Injectable()
export class ClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly properties: PropertiesService,
    private readonly audit: AuditService,
    private readonly events: EventBus,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async requestUploadUrl(
    userId: string,
    contentType: string,
    sizeBytes: number,
  ): Promise<PresignedUpload> {
    if (sizeBytes > MAX_DOCUMENT_SIZE_BYTES) {
      throw new BadRequestAppException('File exceeds the maximum size.', ErrorCode.FILE_TOO_LARGE);
    }
    return this.storage.createPresignedUpload({
      keyPrefix: `claim/${userId}`,
      contentType,
      maxSizeBytes: sizeBytes,
    });
  }

  async create(userId: string, propertyId: string, dto: CreateClaimDto): Promise<PropertyClaim> {
    const property = await this.properties.getById(propertyId);

    const prefix = `claim/${userId}/`;
    for (const doc of dto.documents) {
      if (!doc.storageKey.startsWith(prefix)) {
        throw new ForbiddenAppException('Document key does not belong to you.');
      }
    }

    // One active claim per (property, claimant, role) — DB partial unique index
    // backs this; we check first for a friendly error.
    const existing = await this.prisma.propertyClaim.findFirst({
      where: {
        propertyId: property.id,
        claimantId: userId,
        role: dto.role,
        status: { in: [ClaimStatus.PENDING, ClaimStatus.APPROVED] },
      },
    });
    if (existing) {
      throw new ConflictAppException(
        'You already have an active claim for this property.',
        ErrorCode.CLAIM_ALREADY_EXISTS,
      );
    }

    const claim = await this.prisma.propertyClaim.create({
      data: {
        propertyId: property.id,
        claimantId: userId,
        role: dto.role,
        status: ClaimStatus.PENDING,
        documents: {
          create: dto.documents.map((d) => ({
            storageKey: d.storageKey,
            contentType: d.contentType,
            sizeBytes: d.sizeBytes,
          })),
        },
      },
    });

    await this.events.emit(DomainEvent.PROPERTY_CLAIMED, {
      propertyId: property.id,
      claimId: claim.id,
    });
    await this.audit.record({
      actorId: userId,
      action: 'PROPERTY_CLAIM_REQUESTED',
      entityType: 'PropertyClaim',
      entityId: claim.id,
    });
    return claim;
  }

  listMine(userId: string) {
    return this.prisma.propertyClaim.findMany({
      where: { claimantId: userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, propertyId: true, role: true, status: true, createdAt: true },
    });
  }

  listPending() {
    return this.prisma.propertyClaim.findMany({
      where: { status: ClaimStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      include: { documents: { select: { id: true, contentType: true, sizeBytes: true } } },
    });
  }

  async getDocumentDownloadUrl(reviewerId: string, documentId: string) {
    const doc = await this.prisma.claimDocument.findUnique({ where: { id: documentId } });
    if (!doc) {
      throw new NotFoundAppException('Document not found', ErrorCode.NOT_FOUND);
    }
    const signed = await this.storage.createPresignedDownload(doc.storageKey);
    await this.audit.record({
      actorId: reviewerId,
      action: 'CLAIM_DOCUMENT_ACCESSED',
      entityType: 'ClaimDocument',
      entityId: documentId,
    });
    return signed;
  }

  /**
   * Admin decision. On approval, marks the property claimed, grants the
   * claimant the role they requested (OWNER or MANAGER) if not already held,
   * and links them via the appropriate join table so ownership is explicit.
   */
  async decide(
    reviewerId: string,
    claimId: string,
    decision: 'APPROVED' | 'REJECTED',
    rejectionReason?: string,
  ): Promise<PropertyClaim> {
    const claim = await this.prisma.propertyClaim.findUnique({ where: { id: claimId } });
    if (!claim) {
      throw new NotFoundAppException('Claim not found', ErrorCode.CLAIM_NOT_FOUND);
    }
    if (claim.status !== ClaimStatus.PENDING) {
      throw new BadRequestAppException(
        'Only pending claims can be decided.',
        ErrorCode.BAD_REQUEST,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.propertyClaim.update({
        where: { id: claimId },
        data: {
          status: decision as ClaimStatus,
          reviewerId,
          decidedAt: new Date(),
          rejectionReason: decision === 'REJECTED' ? (rejectionReason ?? null) : null,
        },
      });

      if (decision === 'APPROVED') {
        await tx.property.update({ where: { id: claim.propertyId }, data: { isClaimed: true } });

        // Grant the requested role (idempotent — only add if missing).
        const user = await tx.user.findUniqueOrThrow({ where: { id: claim.claimantId } });
        const roleToGrant = claim.role === ClaimRole.OWNER ? UserRole.OWNER : UserRole.MANAGER;
        if (!user.roles.includes(roleToGrant)) {
          await tx.user.update({
            where: { id: claim.claimantId },
            data: { roles: { set: [...user.roles, roleToGrant] } },
          });
        }
      }
      return result;
    });

    if (decision === 'APPROVED') {
      await this.events.emit(DomainEvent.PROPERTY_CLAIM_APPROVED, {
        propertyId: claim.propertyId,
        claimId,
      });
    }
    await this.audit.record({
      actorId: reviewerId,
      action: decision === 'APPROVED' ? 'PROPERTY_CLAIM_APPROVED' : 'PROPERTY_CLAIM_REJECTED',
      entityType: 'PropertyClaim',
      entityId: claimId,
      metadata: { decision },
    });
    return updated;
  }

  /**
   * A verified owner/manager adds (or updates) a public response to a review on
   * a property they have an APPROVED claim for. The response is clearly
   * labelled on the public surface. This method deliberately never reads or
   * mutates the review's content, status, or author.
   */
  async respondToReview(
    responderId: string,
    reviewId: string,
    dto: OwnerResponseDto,
  ): Promise<OwnerResponse> {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, status: ReviewStatus.PUBLISHED, deletedAt: null },
    });
    if (!review) {
      throw new NotFoundAppException('Review not found', ErrorCode.REVIEW_NOT_FOUND);
    }

    await this.assertCanRespond(responderId, review.propertyId);

    return this.prisma.ownerResponse.upsert({
      where: { reviewId },
      create: { reviewId, responderId, body: dto.body },
      update: { body: dto.body, responderId },
    });
  }

  /** Confirms the user holds an APPROVED claim for the review's property. */
  private async assertCanRespond(userId: string, propertyId: string): Promise<void> {
    const claim = await this.prisma.propertyClaim.findFirst({
      where: { propertyId, claimantId: userId, status: ClaimStatus.APPROVED },
    });
    if (!claim) {
      throw new ForbiddenAppException(
        'Only a verified owner or manager of this property can respond.',
      );
    }
  }

  /** Public owner response for a review (labelled), if any. */
  async getPublicResponse(reviewId: string) {
    const response = await this.prisma.ownerResponse.findUnique({ where: { reviewId } });
    if (!response) return null;
    return {
      reviewId: response.reviewId,
      body: response.body,
      label: 'Official response from property owner/manager',
      respondedAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
  }
}
