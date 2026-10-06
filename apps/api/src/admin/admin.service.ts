import { Injectable } from '@nestjs/common';
import {
  Landlord,
  LandlordLinkRole,
  Prisma,
  PropertyManager,
  ReportStatus,
  ReviewStatus,
  User,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { PropertiesService } from '../properties/properties.service';
import { AuditService } from '../audit/audit.service';
import { ConflictAppException, NotFoundAppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { slugify } from '../common/util/slug.util';
import { OffsetPaginationQuery } from '../common/dto/pagination.dto';
import { parsePropertyCsv, RowError } from './csv-import';
import {
  CreateLandlordDto,
  CreateManagerDto,
  CsvImportDto,
  LinkLandlordDto,
  UpdateScoreWeightsDto,
} from './dto/admin.dto';

/**
 * Admin domain. Aggregates dashboard metrics, manages users / landlords /
 * managers / score configuration, and runs validated CSV property imports.
 * Admin tables use OFFSET pagination (documented tradeoff: datasets are bounded
 * and admins need total counts and page jumps).
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly properties: PropertiesService,
    private readonly audit: AuditService,
  ) {}

  /** Dashboard metrics in a single aggregated call. */
  async dashboard() {
    const [
      users,
      verifiedResidents,
      reviews,
      verifiedReviews,
      properties,
      claimedProperties,
      pendingModeration,
      pendingVerification,
      openReports,
      activeCities,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, emailVerifiedAt: { not: null } } }),
      this.prisma.review.count({ where: { deletedAt: null } }),
      this.prisma.review.count({ where: { deletedAt: null, isVerified: true } }),
      this.prisma.property.count({ where: { deletedAt: null } }),
      this.prisma.property.count({ where: { deletedAt: null, isClaimed: true } }),
      this.prisma.review.count({
        where: { status: { in: [ReviewStatus.PENDING_MODERATION, ReviewStatus.UNDER_REVIEW] } },
      }),
      this.prisma.verificationRequest.count({ where: { status: VerificationStatus.PENDING } }),
      this.prisma.reviewReport.count({ where: { status: ReportStatus.OPEN } }),
      this.prisma.city.count({ where: { isActive: true } }),
    ]);

    return {
      users,
      verifiedResidents,
      reviews,
      verifiedReviews,
      properties,
      claimedProperties,
      pendingModeration,
      pendingVerification,
      openReports,
      activeCities,
    };
  }

  // ----- Users -----

  async listUsers(query: OffsetPaginationQuery & { search?: string }) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.search ? { email: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: query.order },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          email: true,
          displayName: true,
          roles: true,
          status: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      }),
    ]);
    return { items: rows, total, page: query.page, pageSize: query.pageSize };
  }

  async setUserRoles(actorId: string, userId: string, roles: User['roles']): Promise<User> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) {
      throw new NotFoundAppException('User not found', ErrorCode.USER_NOT_FOUND);
    }
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { roles } });
    await this.audit.record({
      actorId,
      action: 'USER_ROLES_UPDATED',
      entityType: 'User',
      entityId: userId,
      metadata: { roles },
    });
    return updated;
  }

  async setUserStatus(
    actorId: string,
    userId: string,
    status: 'ACTIVE' | 'SUSPENDED',
  ): Promise<User> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) {
      throw new NotFoundAppException('User not found', ErrorCode.USER_NOT_FOUND);
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: status as UserStatus },
    });
    await this.audit.record({
      actorId,
      action: 'USER_STATUS_UPDATED',
      entityType: 'User',
      entityId: userId,
      metadata: { status },
    });
    return updated;
  }

  // ----- Landlords & managers -----

  async createLandlord(dto: CreateLandlordDto): Promise<Landlord> {
    try {
      return await this.prisma.landlord.create({
        data: {
          displayName: dto.displayName,
          slug: this.uniqueSlug(dto.displayName),
          aliases: dto.aliases ?? [],
          isCompany: dto.isCompany ?? false,
        },
      });
    } catch (err) {
      throw this.mapUnique(err, 'A landlord with this name already exists.');
    }
  }

  listLandlords(query: OffsetPaginationQuery) {
    return this.offsetList(this.prisma.landlord, { deletedAt: null }, query);
  }

  async createManager(dto: CreateManagerDto): Promise<PropertyManager> {
    try {
      return await this.prisma.propertyManager.create({
        data: {
          displayName: dto.displayName,
          slug: this.uniqueSlug(dto.displayName),
          company: dto.company ?? null,
        },
      });
    } catch (err) {
      throw this.mapUnique(err, 'A manager with this name already exists.');
    }
  }

  listManagers(query: OffsetPaginationQuery) {
    return this.offsetList(this.prisma.propertyManager, { deletedAt: null }, query);
  }

  /** Links a landlord to a property (property may have many landlords). */
  async linkLandlord(propertyId: string, dto: LinkLandlordDto) {
    const property = await this.properties.getById(propertyId);
    const landlord = await this.prisma.landlord.findUnique({ where: { id: dto.landlordId } });
    if (!landlord) {
      throw new NotFoundAppException('Landlord not found', ErrorCode.NOT_FOUND);
    }
    return this.prisma.propertyLandlord.upsert({
      where: { propertyId_landlordId: { propertyId: property.id, landlordId: landlord.id } },
      create: {
        propertyId: property.id,
        landlordId: landlord.id,
        role: (dto.role ?? 'OWNER') as LandlordLinkRole,
      },
      update: { role: (dto.role ?? 'OWNER') as LandlordLinkRole },
    });
  }

  // ----- Reports & analytics -----

  listReports(query: OffsetPaginationQuery) {
    return this.offsetList(this.prisma.reviewReport, {}, query, { createdAt: query.order });
  }

  async analyticsSummary() {
    const [byName] = await Promise.all([
      this.prisma.analyticsEvent.groupBy({
        by: ['name'],
        _count: { name: true },
        orderBy: { _count: { name: 'desc' } },
      }),
    ]);
    return {
      events: byName.map((e) => ({ name: e.name, count: e._count.name })),
    };
  }

  // ----- CSV import -----

  /**
   * Validates and (unless dryRun) imports properties from CSV. Validation
   * errors are returned per-row; valid rows are created idempotently (dedupe is
   * enforced by PropertiesService). Returns a per-row outcome report.
   */
  async importPropertiesCsv(actorId: string, dto: CsvImportDto) {
    const locality = await this.prisma.locality.findUnique({ where: { id: dto.localityId } });
    if (!locality) {
      throw new NotFoundAppException('Locality not found', ErrorCode.LOCALITY_NOT_FOUND);
    }

    const parsed = parsePropertyCsv(dto.csv);
    const created: string[] = [];
    const skipped: RowError[] = [...parsed.errors];

    if (!dto.dryRun) {
      for (let i = 0; i < parsed.valid.length; i++) {
        const row = parsed.valid[i];
        try {
          const property = await this.properties.create({
            displayName: row.displayName,
            propertyType: row.propertyType,
            aliases: row.aliases,
            localityId: dto.localityId,
            latitude: row.latitude,
            longitude: row.longitude,
            developer: row.developer,
            yearBuilt: row.yearBuilt,
          });
          created.push(property.id);
        } catch (err) {
          // Duplicate or other domain error — report, continue.
          const message = err instanceof Error ? err.message : 'Unknown error';
          skipped.push({ row: i + 1, errors: [message] });
        }
      }
      await this.audit.record({
        actorId,
        action: 'PROPERTY_CSV_IMPORT',
        entityType: 'Locality',
        entityId: dto.localityId,
        metadata: { created: created.length, skipped: skipped.length },
      });
    }

    return {
      dryRun: dto.dryRun ?? false,
      totalRows: parsed.valid.length + parsed.errors.length,
      validRows: parsed.valid.length,
      createdCount: created.length,
      createdIds: created,
      issues: skipped,
    };
  }

  // ----- Settings: score weights -----

  /**
   * Creates a new score configuration and (optionally) activates it. The DB
   * single-active partial unique index means we must deactivate the current
   * active config in the same transaction before activating the new one.
   */
  async updateScoreWeights(actorId: string, dto: UpdateScoreWeightsDto) {
    const activate = dto.activate ?? true;
    const config = await this.prisma.$transaction(async (tx) => {
      if (activate) {
        await tx.scoreConfiguration.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }
      return tx.scoreConfiguration.upsert({
        where: { name: dto.name },
        create: { name: dto.name, weights: dto.weights, isActive: activate },
        update: { weights: dto.weights, isActive: activate },
      });
    });
    await this.audit.record({
      actorId,
      action: 'SCORE_CONFIG_UPDATED',
      entityType: 'ScoreConfiguration',
      entityId: config.id,
      metadata: { name: dto.name, activate },
    });
    return config;
  }

  listScoreConfigs() {
    return this.prisma.scoreConfiguration.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // --------------------------------------------------------------------------

  private uniqueSlug(name: string): string {
    return `${slugify(name)}-${randomBytes(2).toString('hex')}`;
  }

  private mapUnique(err: unknown, message: string): Error {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return new ConflictAppException(message, ErrorCode.CONFLICT);
    }
    return err instanceof Error ? err : new Error('Unknown error');
  }

  /** Generic offset-paginated list helper for simple admin tables. */
  private async offsetList<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delegate: { count: (args: any) => Promise<number>; findMany: (args: any) => Promise<T[]> },
    where: Record<string, unknown>,
    query: OffsetPaginationQuery,
    orderBy: Record<string, 'asc' | 'desc'> = { createdAt: query.order },
  ) {
    const [total, items] = await Promise.all([
      delegate.count({ where }),
      delegate.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
}
