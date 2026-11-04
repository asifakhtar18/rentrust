import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  Property,
  PropertyContributionKind,
  PropertyContributionStatus,
  PropertyStatus,
  PropertyType,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import {
  BadRequestAppException,
  ConflictAppException,
  NotFoundAppException,
  ValidationException,
} from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { PresignedUpload, STORAGE_PROVIDER, StorageProvider } from '../files/storage.interface';
import { normalizeName, slugify } from '../common/util/slug.util';
import { buildCursorPage, decodeCursor, PaginatedResult } from '../common/pagination/cursor.util';
import {
  AdminListPropertiesQuery,
  CreatePropertyDto,
  ListPropertiesQuery,
  PropertyMapBoundsQuery,
  NearbyPropertiesQuery,
  PropertySimilarityQuery,
  UpdatePropertyDto,
} from './dto/property.dto';
import { MAX_PROPERTY_IMAGE_SIZE_BYTES, MAX_PROPERTY_IMAGES } from './dto/property-image.dto';
import { LocationsService } from '../locations/locations.service';
import {
  CreatePropertyContributionDto,
  ReviewPropertyContributionDto,
} from './dto/property-contribution.dto';

interface PropertyListCursor extends Record<string, unknown> {
  createdAt: string;
  id: string;
}

/** A property with its nearby distance, returned by geo queries. */
export interface PropertyWithDistance extends Property {
  distanceMeters: number;
  localityName?: string | null;
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
  google_maps_url: string | null;
  merged_into_id: string | null;
  is_claimed: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  distance_meters: number;
  locality_name: string | null;
}

/**
 * Owns property persistence and the canonical-entity / duplicate-detection
 * rules. Geo queries use parameterised raw SQL so PostGIS does the distance
 * work in the database with a spatial index — never by loading rows into app
 * memory.
 */
@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly locations: LocationsService,
  ) {}

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

  async requestImageUpload(
    propertyId: string,
    contentType: string,
    sizeBytes: number,
  ): Promise<PresignedUpload> {
    await this.getById(propertyId);
    if (sizeBytes < 1 || sizeBytes > MAX_PROPERTY_IMAGE_SIZE_BYTES) {
      throw new BadRequestAppException('Image must be 10 MB or smaller.', ErrorCode.FILE_TOO_LARGE);
    }
    return this.storage.createPresignedUpload({
      keyPrefix: `property-images/${propertyId}`,
      contentType,
      maxSizeBytes: sizeBytes,
    });
  }

  async addImage(
    propertyId: string,
    input: {
      storageKey: string;
      contentType: string;
      sizeBytes: number;
      altText?: string;
    },
  ) {
    await this.getById(propertyId);
    const requiredPrefix = `property-images/${propertyId}/`;
    if (!input.storageKey.startsWith(requiredPrefix)) {
      throw new BadRequestAppException('Image key does not belong to this property.');
    }
    if (input.sizeBytes < 1 || input.sizeBytes > MAX_PROPERTY_IMAGE_SIZE_BYTES) {
      throw new BadRequestAppException('Image must be 10 MB or smaller.', ErrorCode.FILE_TOO_LARGE);
    }
    await this.storage.assertUploadedDocument(input.storageKey, input.contentType, input.sizeBytes);

    const imageCount = await this.prisma.propertyImage.count({ where: { propertyId } });
    if (imageCount >= MAX_PROPERTY_IMAGES) {
      await this.storage.delete(input.storageKey);
      throw new BadRequestAppException(`A property can have up to ${MAX_PROPERTY_IMAGES} photos.`);
    }

    return this.prisma.propertyImage.create({
      data: {
        propertyId,
        storageKey: input.storageKey,
        contentType: input.contentType,
        altText: input.altText?.trim() || null,
      },
    });
  }

  async deleteImage(propertyId: string, imageId: string): Promise<void> {
    await this.getById(propertyId);
    const image = await this.prisma.propertyImage.findFirst({ where: { id: imageId, propertyId } });
    if (!image) throw new NotFoundAppException('Property image not found.', ErrorCode.NOT_FOUND);
    await this.storage.delete(image.storageKey);
    await this.prisma.propertyImage.delete({ where: { id: image.id } });
  }

  async getDetail(id: string) {
    const property = await this.getById(id);
    const [address, locality, score, landlordLinks, managerLinks, reviewCount, imageRows] =
      await Promise.all([
        property.addressId
          ? this.prisma.address.findUnique({
              where: { id: property.addressId },
              include: {
                city: {
                  select: {
                    name: true,
                    state: { select: { name: true } },
                    country: { select: { name: true } },
                  },
                },
              },
            })
          : null,
        property.localityId
          ? this.prisma.locality.findUnique({
              where: { id: property.localityId },
              include: {
                city: {
                  select: {
                    name: true,
                    state: { select: { name: true } },
                    country: { select: { name: true } },
                  },
                },
              },
            })
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
        this.prisma.propertyImage.findMany({
          where: { propertyId: property.id },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

    const images = await Promise.all(
      imageRows.map(async (image) => ({
        id: image.id,
        altText: image.altText,
        url: (await this.storage.createPresignedDownload(image.storageKey)).downloadUrl,
      })),
    );

    return {
      ...this.toPublic(property),
      address,
      locality,
      score,
      landlords: landlordLinks.map((l) => ({ ...l.landlord, role: l.role })),
      managers: managerLinks.map((m) => ({ ...m.manager, role: m.role })),
      reviewCount,
      images,
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

  async mapPins(bounds: PropertyMapBoundsQuery) {
    if (bounds.west >= bounds.east || bounds.south >= bounds.north) {
      throw new BadRequestAppException('Map bounds are invalid.');
    }
    const properties = await this.prisma.property.findMany({
      where: {
        deletedAt: null,
        status: PropertyStatus.ACTIVE,
        latitude: { gte: bounds.south, lte: bounds.north },
        longitude: { gte: bounds.west, lte: bounds.east },
      },
      select: {
        id: true,
        displayName: true,
        slug: true,
        propertyType: true,
        latitude: true,
        longitude: true,
        locality: { select: { name: true, city: { select: { name: true } } } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 1_001,
    });
    return {
      items: properties.slice(0, 1_000).map((property) => ({
        ...property,
        localityName: property.locality
          ? `${property.locality.name}, ${property.locality.city.name}`
          : null,
      })),
      truncated: properties.length > 1_000,
    };
  }

  async adminList(query: AdminListPropertiesQuery) {
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

    const search = query.search?.trim();
    const rows = await this.prisma.property.findMany({
      where: {
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
        ...(search
          ? {
              OR: [
                { displayName: { contains: search, mode: 'insensitive' } },
                { canonicalName: { contains: normalizeName(search), mode: 'insensitive' } },
                { aliases: { has: search } },
              ],
            }
          : {}),
        ...(cursor
          ? {
              AND: [
                {
                  OR: [
                    { createdAt: { lt: new Date(cursor.createdAt) } },
                    { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
                  ],
                },
              ],
            }
          : {}),
      },
      include: {
        locality: {
          select: { id: true, name: true, city: { select: { name: true } } },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    return buildCursorPage(rows, query.limit, (property) => ({
      createdAt: property.createdAt.toISOString(),
      id: property.id,
    }));
  }

  async findSimilar(query: PropertySimilarityQuery) {
    const name = normalizeName(query.name);
    const words = name
      .split(' ')
      .filter((word) => word.length > 2)
      .slice(0, 5);
    const cityId = query.cityId;
    const localityId = query.localityId;
    const candidates = await this.prisma.property.findMany({
      where: {
        deletedAt: null,
        status: PropertyStatus.ACTIVE,
        OR: [
          { displayName: { contains: query.name.trim(), mode: 'insensitive' } },
          { canonicalName: { contains: name, mode: 'insensitive' } },
          { aliases: { has: query.name.trim() } },
          ...words.map((word) => ({
            displayName: { contains: word, mode: 'insensitive' as const },
          })),
          ...(localityId ? [{ localityId }] : []),
          ...(cityId ? [{ locality: { cityId } }, { address: { cityId } }] : []),
          ...(query.latitude !== undefined && query.longitude !== undefined
            ? [
                {
                  latitude: { gte: query.latitude - 0.025, lte: query.latitude + 0.025 },
                  longitude: { gte: query.longitude - 0.03, lte: query.longitude + 0.03 },
                },
              ]
            : []),
        ],
      },
      include: {
        locality: { select: { name: true, city: { select: { name: true } } } },
      },
      take: 500,
    });

    return candidates
      .map((property) => {
        const distanceMeters =
          query.latitude !== undefined &&
          query.longitude !== undefined &&
          property.latitude !== null &&
          property.longitude !== null
            ? this.distanceMeters(
                query.latitude,
                query.longitude,
                property.latitude,
                property.longitude,
              )
            : null;
        const nameSimilarity = this.nameSimilarity(
          name,
          normalizeName(`${property.displayName} ${property.aliases.join(' ')}`),
        );
        const proximity = distanceMeters === null ? 0 : Math.max(0, 1 - distanceMeters / 2_500);
        return {
          id: property.id,
          displayName: property.displayName,
          propertyType: property.propertyType,
          latitude: property.latitude,
          longitude: property.longitude,
          localityName: property.locality
            ? `${property.locality.name}, ${property.locality.city.name}`
            : null,
          distanceMeters: distanceMeters === null ? null : Math.round(distanceMeters),
          nameSimilarity,
          confidence: Math.round(
            Math.max(nameSimilarity, proximity * 0.8, nameSimilarity * 0.6 + proximity * 0.4) * 100,
          ),
        };
      })
      .filter(
        (candidate) =>
          candidate.nameSimilarity >= 0.16 ||
          (candidate.distanceMeters !== null && candidate.distanceMeters <= 2_000),
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);
  }

  private distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const radians = (value: number) => (value * Math.PI) / 180;
    const dLat = radians(lat2 - lat1);
    const dLon = radians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private nameSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    const grams = (value: string) => {
      const padded = `  ${value} `;
      return new Set(
        Array.from({ length: Math.max(0, padded.length - 2) }, (_, index) =>
          padded.slice(index, index + 3),
        ),
      );
    };
    const left = grams(a);
    const right = grams(b);
    let overlap = 0;
    left.forEach((gram) => {
      if (right.has(gram)) overlap += 1;
    });
    return left.size + right.size ? (2 * overlap) / (left.size + right.size) : 0;
  }

  async submitContribution(userId: string, dto: CreatePropertyContributionDto) {
    if (
      dto.kind === PropertyContributionKind.ADD_PROPERTY &&
      (!dto.displayName || !dto.propertyType || (!dto.cityId && !dto.googleMapsUrl))
    ) {
      throw new BadRequestAppException(
        'A property name, type, and city or Google Maps link are required.',
      );
    }
    if (dto.kind !== PropertyContributionKind.ADD_PROPERTY && !dto.propertyId) {
      throw new BadRequestAppException('Choose the property this request is about.');
    }
    if (
      dto.kind === PropertyContributionKind.EDIT_PROPERTY &&
      !dto.message?.trim() &&
      !dto.displayName &&
      !dto.googleMapsUrl
    ) {
      throw new BadRequestAppException('Describe the correction or enter a proposed detail.');
    }
    if (dto.kind === PropertyContributionKind.ADD_PHOTO && !dto.imageUrl && !dto.message?.trim()) {
      throw new BadRequestAppException(
        'Add a reference photo link or describe the photo you want added.',
      );
    }
    if (dto.propertyId) await this.getById(dto.propertyId);

    const payload: Record<string, unknown> = { ...dto };
    if (dto.googleMapsUrl) {
      const resolved = await this.locations.resolveGoogleMapsLink({
        googleMapsUrl: dto.googleMapsUrl,
      });
      if (resolved.resolvedCityName && !resolved.city) {
        throw new BadRequestAppException(
          `The map link points to ${resolved.resolvedCityName}, which is not in the city catalogue yet.`,
        );
      }
      payload.latitude = resolved.latitude;
      payload.longitude = resolved.longitude;
      if (resolved.city) payload.cityId = resolved.city.id;
      if (dto.kind === PropertyContributionKind.ADD_PROPERTY && resolved.localityName) {
        const locality = await this.prisma.locality.findFirst({
          where: {
            cityId: resolved.city?.id,
            name: { equals: resolved.localityName, mode: 'insensitive' },
          },
          select: { id: true },
        });
        payload.localityId = locality?.id ?? null;
      }
    }
    const cityId = typeof payload.cityId === 'string' ? payload.cityId : undefined;
    if (cityId) {
      const city = await this.prisma.city.findFirst({
        where: { id: cityId, isActive: true },
        select: { id: true },
      });
      if (!city) throw new NotFoundAppException('Choose an active city.', ErrorCode.NOT_FOUND);
    }
    if (typeof payload.localityId === 'string') {
      const locality = await this.prisma.locality.findUnique({
        where: { id: payload.localityId },
        select: { cityId: true },
      });
      if (!locality || (cityId && locality.cityId !== cityId)) {
        throw new BadRequestAppException('Choose a neighbourhood in the selected city.');
      }
    }

    const contribution = await this.prisma.propertyContribution.create({
      data: {
        submitterId: userId,
        propertyId: dto.propertyId,
        kind: dto.kind,
        payload: payload as Prisma.InputJsonValue,
      },
      select: { id: true, kind: true, status: true, createdAt: true },
    });
    return contribution;
  }

  listMyContributions(userId: string) {
    return this.prisma.propertyContribution.findMany({
      where: { submitterId: userId },
      include: { property: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async listContributionQueue() {
    return this.prisma.propertyContribution.findMany({
      where: { status: PropertyContributionStatus.PENDING },
      include: {
        submitter: { select: { displayName: true, email: true } },
        property: {
          select: {
            id: true,
            displayName: true,
            locality: { select: { name: true, city: { select: { name: true } } } },
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 100,
    });
  }

  async reviewContribution(reviewerId: string, id: string, dto: ReviewPropertyContributionDto) {
    const contribution = await this.prisma.propertyContribution.findFirst({
      where: { id, status: PropertyContributionStatus.PENDING },
    });
    if (!contribution)
      throw new NotFoundAppException('Pending property request not found.', ErrorCode.NOT_FOUND);

    let createdProperty: Property | undefined;
    if (dto.decision === 'APPROVED') {
      const payload = contribution.payload as Record<string, unknown>;
      if (contribution.kind === PropertyContributionKind.ADD_PROPERTY) {
        if (
          typeof payload.displayName !== 'string' ||
          typeof payload.cityId !== 'string' ||
          typeof payload.propertyType !== 'string'
        ) {
          throw new BadRequestAppException('This property request is missing required details.');
        }
        createdProperty = await this.create({
          displayName: payload.displayName,
          propertyType: payload.propertyType as PropertyType,
          address: {
            cityId: payload.cityId,
            ...(typeof payload.localityId === 'string' ? { localityId: payload.localityId } : {}),
            ...(typeof payload.addressLine1 === 'string' ? { line1: payload.addressLine1 } : {}),
            ...(typeof payload.addressLine2 === 'string' ? { line2: payload.addressLine2 } : {}),
            ...(typeof payload.postalCode === 'string' ? { postalCode: payload.postalCode } : {}),
          },
          ...(typeof payload.localityId === 'string' ? { localityId: payload.localityId } : {}),
          ...(typeof payload.latitude === 'number' ? { latitude: payload.latitude } : {}),
          ...(typeof payload.longitude === 'number' ? { longitude: payload.longitude } : {}),
          ...(typeof payload.googleMapsUrl === 'string'
            ? { googleMapsUrl: payload.googleMapsUrl }
            : {}),
        });
      } else if (
        contribution.kind === PropertyContributionKind.EDIT_PROPERTY &&
        contribution.propertyId
      ) {
        const update: UpdatePropertyDto = {};
        if (typeof payload.displayName === 'string') update.displayName = payload.displayName;
        if (typeof payload.propertyType === 'string')
          update.propertyType = payload.propertyType as PropertyType;
        if (
          Array.isArray(payload.aliases) &&
          payload.aliases.every((item) => typeof item === 'string')
        )
          update.aliases = payload.aliases;
        if (typeof payload.developer === 'string' || payload.developer === null)
          update.developer = payload.developer as string | null;
        if (typeof payload.yearBuilt === 'number' || payload.yearBuilt === null)
          update.yearBuilt = payload.yearBuilt as number | null;
        if (
          Array.isArray(payload.amenities) &&
          payload.amenities.every((item) => typeof item === 'string')
        )
          update.amenities = payload.amenities;
        if (typeof payload.description === 'string' || payload.description === null)
          update.description = payload.description as string | null;
        if (typeof payload.googleMapsUrl === 'string') update.googleMapsUrl = payload.googleMapsUrl;
        if (typeof payload.cityId === 'string') update.cityId = payload.cityId;
        if (typeof payload.localityId === 'string' || payload.localityId === null)
          update.localityId = payload.localityId as string | null;
        if (typeof payload.addressLine1 === 'string') update.addressLine1 = payload.addressLine1;
        if (typeof payload.addressLine2 === 'string') update.addressLine2 = payload.addressLine2;
        if (typeof payload.postalCode === 'string') update.postalCode = payload.postalCode;
        if (typeof payload.latitude === 'number') update.latitude = payload.latitude;
        if (typeof payload.longitude === 'number') update.longitude = payload.longitude;
        await this.update(contribution.propertyId, update);
      }
    }

    const updated = await this.prisma.propertyContribution.updateMany({
      where: { id, status: PropertyContributionStatus.PENDING },
      data: {
        status:
          dto.decision === 'APPROVED'
            ? PropertyContributionStatus.APPROVED
            : PropertyContributionStatus.REJECTED,
        reviewerId,
        moderatorNote: dto.note?.trim() || null,
        reviewedAt: new Date(),
        ...(createdProperty ? { propertyId: createdProperty.id } : {}),
      },
    });
    if (updated.count !== 1) throw new ConflictAppException('This request was already reviewed.');
    return { id, status: dto.decision, propertyId: createdProperty?.id ?? contribution.propertyId };
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
        p.description, p.google_maps_url, p.merged_into_id, p.is_claimed,
        p.created_at, p.updated_at, p.deleted_at,
        ST_Distance(p.geom::geography, ${point})::float8 AS distance_meters,
        l.name AS locality_name
      FROM properties p
      LEFT JOIN localities l ON l.id = p.locality_id
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
      googleMapsUrl: r.google_maps_url,
      mergedIntoId: r.merged_into_id,
      isClaimed: r.is_claimed,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      deletedAt: r.deleted_at,
      distanceMeters: r.distance_meters,
      localityName: r.locality_name,
    };
  }

  /**
   * Creates a canonical property. Duplicate detection compares the normalised
   * display name against existing canonical names and aliases within the same
   * locality; an exact normalised collision is rejected so the catalogue stays
   * de-duplicated. Near-duplicates are surfaced via search, not blocked here.
   */
  async create(dto: CreatePropertyDto): Promise<Property> {
    const resolved = dto.googleMapsUrl
      ? await this.locations.resolveGoogleMapsLink({ googleMapsUrl: dto.googleMapsUrl })
      : null;
    const resolvedCityId = resolved?.city?.id ?? dto.address?.cityId;
    if (resolved?.resolvedCityName && !resolved.city) {
      throw new BadRequestAppException(
        `The map link points to ${resolved.resolvedCityName}, which is not in the city catalogue yet. Choose a city in that area or suggest the city first.`,
      );
    }
    const localityId =
      resolved?.city && resolved.localityName
        ? ((
            await this.prisma.locality.findFirst({
              where: {
                cityId: resolved.city.id,
                name: { equals: resolved.localityName, mode: 'insensitive' },
              },
              select: { id: true },
            })
          )?.id ?? undefined)
        : resolved?.city
          ? undefined
          : (dto.localityId ?? dto.address?.localityId);
    if (localityId) {
      const locality = await this.prisma.locality.findUnique({
        where: { id: localityId },
        select: { cityId: true },
      });
      if (!locality) throw new NotFoundAppException('Locality not found.', ErrorCode.NOT_FOUND);
      if (resolvedCityId && locality.cityId !== resolvedCityId) {
        throw new BadRequestAppException(
          'The selected neighbourhood does not belong to the city in the map link.',
        );
      }
    }
    const canonicalName = normalizeName(dto.displayName);
    return this.prisma.$transaction(async (tx) => {
      // Serialize concurrent creates for the same canonical property name.
      // Prisma cannot deserialize PostgreSQL's `void` return type. Cast the
      // lock result to text while preserving the transaction-scoped lock.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${canonicalName}, 0))::text`;
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

      const addressInput =
        dto.address || resolvedCityId
          ? {
              ...(dto.address ?? {}),
              cityId: resolvedCityId!,
              localityId: localityId ?? null,
            }
          : null;
      const address = addressInput
        ? await tx.address.create({
            data: {
              line1: addressInput.line1 ?? null,
              line2: addressInput.line2 ?? null,
              cityId: addressInput.cityId,
              localityId: localityId ?? null,
              postalCode: addressInput.postalCode ?? null,
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
          latitude: resolved?.latitude ?? dto.latitude ?? null,
          longitude: resolved?.longitude ?? dto.longitude ?? null,
          developer: dto.developer ?? null,
          yearBuilt: dto.yearBuilt ?? null,
          amenities: dto.amenities ?? [],
          description: dto.description ?? null,
          googleMapsUrl: dto.googleMapsUrl ?? null,
        },
      });
    });
  }

  async update(id: string, dto: UpdatePropertyDto): Promise<Property> {
    const property = await this.getById(id);
    if (dto.googleMapsUrl) {
      const resolved = await this.locations.resolveGoogleMapsLink({
        googleMapsUrl: dto.googleMapsUrl,
      });
      if (resolved.resolvedCityName && !resolved.city) {
        throw new BadRequestAppException(
          `The map link points to ${resolved.resolvedCityName}, which is not in the city catalogue yet.`,
        );
      }
      const resolvedLocalityId =
        resolved.city && resolved.localityName
          ? ((
              await this.prisma.locality.findFirst({
                where: {
                  cityId: resolved.city.id,
                  name: { equals: resolved.localityName, mode: 'insensitive' },
                },
                select: { id: true },
              })
            )?.id ?? null)
          : null;
      dto = {
        ...dto,
        ...(resolved.city ? { cityId: resolved.city.id } : {}),
        ...(resolved.city ? { localityId: resolvedLocalityId } : {}),
        latitude: resolved.latitude,
        longitude: resolved.longitude,
      };
    }
    const data: Prisma.PropertyUpdateInput = {};

    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName;
      data.canonicalName = normalizeName(dto.displayName);
    }
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.propertyType !== undefined) data.propertyType = dto.propertyType;
    if (dto.aliases !== undefined) data.aliases = this.normaliseAliases(dto.aliases);
    if (dto.developer !== undefined) data.developer = dto.developer;
    if (dto.yearBuilt !== undefined) data.yearBuilt = dto.yearBuilt;
    if (dto.amenities !== undefined) data.amenities = dto.amenities;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.googleMapsUrl !== undefined) data.googleMapsUrl = dto.googleMapsUrl;
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;

    if (dto.localityId !== undefined) {
      if (dto.localityId === null) data.locality = { disconnect: true };
      else {
        const locality = await this.prisma.locality.findUnique({
          where: { id: dto.localityId },
          select: { id: true, cityId: true },
        });
        if (!locality) throw new NotFoundAppException('Locality not found.', ErrorCode.NOT_FOUND);
        if (dto.cityId && locality.cityId !== dto.cityId) {
          throw new BadRequestAppException('Choose a neighbourhood in the selected city.');
        }
        data.locality = { connect: { id: locality.id } };
      }
    }

    const addressChanged =
      dto.cityId !== undefined ||
      dto.addressLine1 !== undefined ||
      dto.addressLine2 !== undefined ||
      dto.postalCode !== undefined ||
      dto.localityId !== undefined;
    if (addressChanged) {
      const locality = dto.localityId
        ? await this.prisma.locality.findUnique({
            where: { id: dto.localityId },
            select: { cityId: true },
          })
        : null;
      const cityId = dto.cityId ?? locality?.cityId;
      if (!property.addressId && !cityId) {
        throw new BadRequestAppException('Choose a city before adding address details.');
      }
      if (property.addressId) {
        await this.prisma.address.update({
          where: { id: property.addressId },
          data: {
            ...(cityId ? { cityId } : {}),
            ...(dto.localityId !== undefined ? { localityId: dto.localityId } : {}),
            ...(dto.addressLine1 !== undefined ? { line1: dto.addressLine1 } : {}),
            ...(dto.addressLine2 !== undefined ? { line2: dto.addressLine2 } : {}),
            ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
          },
        });
      } else if (cityId) {
        const address = await this.prisma.address.create({
          data: {
            cityId,
            localityId: dto.localityId ?? null,
            line1: dto.addressLine1 ?? null,
            line2: dto.addressLine2 ?? null,
            postalCode: dto.postalCode ?? null,
          },
        });
        data.address = { connect: { id: address.id } };
      }
    }

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
      googleMapsUrl: p.googleMapsUrl,
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
