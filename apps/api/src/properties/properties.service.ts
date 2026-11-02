import { Injectable } from '@nestjs/common';
import { Prisma, Property, PropertyStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import {
  ConflictAppException,
  NotFoundAppException,
  ValidationException,
} from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { normalizeName, slugify } from '../common/util/slug.util';
import { buildCursorPage, decodeCursor, PaginatedResult } from '../common/pagination/cursor.util';
import {
  CreatePropertyDto,
  ListPropertiesQuery,
  NearbyPropertiesQuery,
  UpdatePropertyDto,
} from './dto/property.dto';

interface PropertyListCursor extends Record<string, unknown> {
  createdAt: string;
  id: string;
}

/** A property with its nearby distance, returned by geo queries. */
export interface PropertyWithDistance extends Property {
  distanceMeters: number;
}

/** Raw snake_case row shape returned by the PostGIS nearby query. */
interface RawNearbyRow {
  id: string;
  canonical_name: string;
  display_name: string;
  slug: string;
  aliases: string[];
  property_type: Property['propertyType'];
  status: PropertyStatus;
  address_id: string | null;
  locality_id: string | null;
  building_id: string | null;
  latitude: number | null;
  longitude: number | null;
  developer: string | null;
  year_built: number | null;
  amenities: string[];
  description: string | null;
  merged_into_id: string | null;
  is_claimed: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  distance_meters: number;
}

/**
 * Owns property persistence and the canonical-entity / duplicate-detection
 * rules. Geo queries use parameterised raw SQL so PostGIS does the distance
 * work in the database with a spatial index — never by loading rows into app
 * memory.
 */
@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string): Promise<Property> {
    const property = await this.prisma.property.findFirst({
      where: { id, deletedAt: null },
    });
    if (!property) {
      throw new NotFoundAppException('Property not found', ErrorCode.PROPERTY_NOT_FOUND);
    }
    // Follow a merge pointer so callers always land on the surviving entity.
    if (property.status === PropertyStatus.MERGED && property.mergedIntoId) {
      return this.getById(property.mergedIntoId);
    }
    return property;
  }

  async getBySlug(slug: string): Promise<Property> {
    const property = await this.prisma.property.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!property) {
      throw new NotFoundAppException('Property not found', ErrorCode.PROPERTY_NOT_FOUND);
    }
    return property;
  }

  async getDetail(id: string) {
    const property = await this.getById(id);
    const [address, locality, score, landlordLinks, managerLinks, reviewCount] = await Promise.all([
      property.addressId
        ? this.prisma.address.findUnique({ where: { id: property.addressId } })
        : null,
      property.localityId
        ? this.prisma.locality.findUnique({ where: { id: property.localityId } })
        : null,
      this.prisma.propertyScore.findUnique({ where: { propertyId: property.id } }),
      this.prisma.propertyLandlord.findMany({
        where: { propertyId: property.id, landlord: { is: { deletedAt: null } } },
        include: { landlord: true },
      }),
      this.prisma.propertyManagerLink.findMany({
        where: { propertyId: property.id, manager: { is: { deletedAt: null } } },
        include: { manager: true },
      }),
      this.prisma.review.count({
        where: { propertyId: property.id, status: 'PUBLISHED', deletedAt: null },
      }),
    ]);

    return {
      ...this.toPublic(property),
      address,
      locality,
      score,
      landlords: landlordLinks.map((l) => ({ ...l.landlord, role: l.role })),
      managers: managerLinks.map((m) => ({ ...m.manager, role: m.role })),
      reviewCount,
    };
  }

  /**
   * Lists active properties with cursor pagination ordered by newest first.
   */
  async list(query: ListPropertiesQuery): Promise<PaginatedResult<Property>> {
    const cursor = decodeCursor<PropertyListCursor>(query.cursor);
    if (
      query.cursor &&
      (!cursor ||
        typeof cursor.createdAt !== 'string' ||
        !Number.isFinite(new Date(cursor.createdAt).getTime()) ||
        typeof cursor.id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          cursor.id,
        ))
    ) {
      throw new ValidationException('Invalid property list cursor.');
    }
    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      status: PropertyStatus.ACTIVE,
      ...(query.propertyType ? { propertyType: query.propertyType } : {}),
      ...(query.localityId ? { localityId: query.localityId } : {}),
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.createdAt) } },
              { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.property.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    return buildCursorPage(rows, query.limit, (p) => ({
      createdAt: p.createdAt.toISOString(),
      id: p.id,
    }));
  }

  /**
   * Finds active properties within a radius, nearest first, using PostGIS
   * ST_DWithin + ST_Distance on geography. Values are bound as parameters to
   * prevent SQL injection.
   */
  async nearby(query: NearbyPropertiesQuery): Promise<PropertyWithDistance[]> {
    const { latitude, longitude, radiusMeters, limit } = query;
    const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`;

    // Select explicit columns (not p.*): the table has `geom` (geometry) and
    // `search_vector` (tsvector) columns Prisma's raw deserialiser cannot map,
    // and distance is cast to float8 so it returns as a JS number not BigInt.
    const rows = await this.prisma.$queryRaw<Array<RawNearbyRow>>(Prisma.sql`
      SELECT
        p.id, p.canonical_name, p.display_name, p.slug, p.aliases,
        p.property_type, p.status, p.address_id, p.locality_id, p.building_id,
        p.latitude, p.longitude, p.developer, p.year_built, p.amenities,
        p.description, p.merged_into_id, p.is_claimed,
        p.created_at, p.updated_at, p.deleted_at,
        ST_Distance(p.geom::geography, ${point})::float8 AS distance_meters
      FROM properties p
      WHERE p.deleted_at IS NULL
        AND p.status = 'ACTIVE'
        AND p.geom IS NOT NULL
        AND ST_DWithin(p.geom::geography, ${point}, ${radiusMeters})
      ORDER BY p.geom::geography <-> ${point}
      LIMIT ${limit}
    `);

    return rows.map((r) => this.mapRawNearby(r));
  }

  private mapRawNearby(r: RawNearbyRow): PropertyWithDistance {
    return {
      id: r.id,
      canonicalName: r.canonical_name,
      displayName: r.display_name,
      slug: r.slug,
      aliases: r.aliases,
      propertyType: r.property_type,
      status: r.status,
      addressId: r.address_id,
      localityId: r.locality_id,
      buildingId: r.building_id,
      latitude: r.latitude,
      longitude: r.longitude,
      developer: r.developer,
      yearBuilt: r.year_built,
      amenities: r.amenities,
      description: r.description,
      mergedIntoId: r.merged_into_id,
      isClaimed: r.is_claimed,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      deletedAt: r.deleted_at,
      distanceMeters: r.distance_meters,
    };
  }

  /**
   * Creates a canonical property. Duplicate detection compares the normalised
   * display name against existing canonical names and aliases within the same
   * locality; an exact normalised collision is rejected so the catalogue stays
   * de-duplicated. Near-duplicates are surfaced via search, not blocked here.
   */
  async create(dto: CreatePropertyDto): Promise<Property> {
    const canonicalName = normalizeName(dto.displayName);
    const localityId = dto.localityId ?? dto.address?.localityId;
    return this.prisma.$transaction(async (tx) => {
      // Share the same transaction-scoped lock as the Worker so concurrent
      // Nest and Worker creates cannot both pass the canonical-name check.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${canonicalName}, 0))`;
      const duplicate = await tx.property.findFirst({
        where: {
          deletedAt: null,
          canonicalName,
          ...(localityId ? { localityId } : {}),
        },
      });
      if (duplicate) {
        throw new ConflictAppException(
          'A property with this name already exists in this locality.',
          ErrorCode.PROPERTY_ALREADY_EXISTS,
        );
      }

      const address = dto.address
        ? await tx.address.create({
            data: {
              line1: dto.address.line1 ?? null,
              line2: dto.address.line2 ?? null,
              cityId: dto.address.cityId,
              localityId: dto.address.localityId ?? null,
              postalCode: dto.address.postalCode ?? null,
            },
          })
        : null;
      return tx.property.create({
        data: {
          canonicalName,
          displayName: dto.displayName,
          slug: this.uniqueSlug(dto.displayName),
          aliases: this.normaliseAliases(dto.aliases),
          propertyType: dto.propertyType,
          status: PropertyStatus.ACTIVE,
          addressId: address?.id,
          localityId,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          developer: dto.developer ?? null,
          yearBuilt: dto.yearBuilt ?? null,
          amenities: dto.amenities ?? [],
          description: dto.description ?? null,
        },
      });
    });
  }

  async update(id: string, dto: UpdatePropertyDto): Promise<Property> {
    const property = await this.getById(id);
    const data: Prisma.PropertyUpdateInput = {};

    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName;
      data.canonicalName = normalizeName(dto.displayName);
    }
    if (dto.propertyType !== undefined) data.propertyType = dto.propertyType;
    if (dto.aliases !== undefined) data.aliases = this.normaliseAliases(dto.aliases);
    if (dto.developer !== undefined) data.developer = dto.developer;
    if (dto.yearBuilt !== undefined) data.yearBuilt = dto.yearBuilt;
    if (dto.amenities !== undefined) data.amenities = dto.amenities;
    if (dto.description !== undefined) data.description = dto.description;

    return this.prisma.property.update({ where: { id: property.id }, data });
  }

  async softDelete(id: string): Promise<void> {
    const property = await this.getById(id);
    await this.prisma.property.update({
      where: { id: property.id },
      data: { deletedAt: new Date(), status: PropertyStatus.ARCHIVED },
    });
  }

  /** Adds an alias to a property, de-duplicating against existing aliases. */
  async addAlias(id: string, alias: string): Promise<Property> {
    const property = await this.getById(id);
    const normalized = normalizeName(alias);
    const set = new Set(property.aliases.map(normalizeName));
    if (set.has(normalized)) {
      return property;
    }
    return this.prisma.property.update({
      where: { id: property.id },
      data: { aliases: [...property.aliases, alias] },
    });
  }

  // --------------------------------------------------------------------------

  /** Public-safe projection (identical fields today; a seam for future hiding). */
  toPublic(p: Property) {
    return {
      id: p.id,
      canonicalName: p.canonicalName,
      displayName: p.displayName,
      slug: p.slug,
      aliases: p.aliases,
      propertyType: p.propertyType,
      status: p.status,
      localityId: p.localityId,
      latitude: p.latitude,
      longitude: p.longitude,
      developer: p.developer,
      yearBuilt: p.yearBuilt,
      amenities: p.amenities,
      description: p.description,
      isClaimed: p.isClaimed,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private normaliseAliases(aliases?: string[]): string[] {
    if (!aliases) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const alias of aliases) {
      const key = normalizeName(alias);
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(alias.trim());
      }
    }
    return result;
  }

  private uniqueSlug(name: string): string {
    return `${slugify(name)}-${randomBytes(3).toString('hex')}`;
  }
}
