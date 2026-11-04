import { Injectable } from '@nestjs/common';
import { City, Country, Locality, LocalitySuggestionStatus, Prisma, State } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../database/redis.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OffsetPaginationQuery } from '../common/dto/pagination.dto';
import {
  BadRequestAppException,
  ConflictAppException,
  NotFoundAppException,
} from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { slugify } from '../common/util/slug.util';
import { CreateCityDto, CreateLocalityDto, ResolveGoogleMapsDto } from './dto/location.dto';
import {
  CreateLocalitySuggestionDto,
  ReviewLocalitySuggestionDto,
} from './dto/locality-suggestion.dto';
import { DecideLocalityReviewDto, SubmitLocalityReviewDto } from './dto/locality-review.dto';

interface NominatimResult {
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string | undefined>;
}

interface OlaAddressComponent {
  long_name?: string;
  types?: string[];
}

interface OlaGeocodeResult {
  name?: string;
  formatted_address?: string;
  geometry?: { location?: { lat?: number | string; lng?: number | string } };
  address_components?: OlaAddressComponent[];
}

interface OlaGeocodeResponse {
  results?: OlaGeocodeResult[];
  geocodingResults?: OlaGeocodeResult[];
}

export interface ResolvedMapPlace {
  latitude: number;
  longitude: number;
  placeName?: string;
  localityName: string | null;
  resolvedCityName: string | null;
  stateName: string | null;
  countryName: string | null;
  city: { id: string; name: string; stateName: string; countryName: string } | null;
}

/**
 * Owns geography reference data: countries, states, cities, localities. Cities
 * and localities carry coordinates whose geometry column is maintained by DB
 * triggers (see migration), so writes here only set lat/lng.
 */
@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  async resolveGoogleMapsLink(dto: ResolveGoogleMapsDto): Promise<ResolvedMapPlace> {
    const url = this.parseGoogleMapsLink(dto.googleMapsUrl);
    const cacheKey = `rentrust:maps:resolve:${createHash('sha256').update(url.toString()).digest('hex')}`;
    const cached = await this.redis.client.get(cacheKey);
    if (cached) return JSON.parse(cached) as ResolvedMapPlace;

    const lockKey = 'rentrust:nominatim:global-request-slot';
    const lockToken = randomBytes(16).toString('hex');
    const startedAt = Date.now();
    let acquired = false;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const existing = await this.redis.client.get(cacheKey);
      if (existing) return JSON.parse(existing) as ResolvedMapPlace;
      acquired = (await this.redis.client.set(lockKey, lockToken, 'PX', 10_000, 'NX')) === 'OK';
      if (acquired) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!acquired)
      throw new BadRequestAppException('Map lookup is busy. Please try again in a moment.');

    let place: ResolvedMapPlace | undefined;
    try {
      place = await this.geocodeMapUrl(url);
      await this.redis.client.set(cacheKey, JSON.stringify(place), 'EX', 60 * 60 * 24 * 30);
      return place;
    } finally {
      const waitMs = process.env.OLA_MAP_API_KEY?.trim()
        ? 0
        : Math.max(0, 1_100 - (Date.now() - startedAt));
      if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
      await this.redis.client.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        lockKey,
        lockToken,
      );
    }
  }

  private parseGoogleMapsLink(raw: string): URL {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new BadRequestAppException('Paste a valid Google Maps link.');
    }
    const host = url.hostname.toLowerCase();
    const isMapsShortLink = host === 'maps.app.goo.gl' || host === 'goo.gl';
    const trusted =
      host === 'google.com' ||
      host.endsWith('.google.com') ||
      host === 'google.co.in' ||
      host.endsWith('.google.co.in') ||
      isMapsShortLink;
    if (
      !trusted ||
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (!url.pathname.startsWith('/maps') && !isMapsShortLink)
    ) {
      throw new BadRequestAppException('Use a Google Maps place or directions link.');
    }
    return url;
  }

  private async geocodeMapUrl(url: URL): Promise<ResolvedMapPlace> {
    const expanded =
      url.hostname === 'goo.gl' || url.hostname.endsWith('.goo.gl')
        ? await this.expandGoogleMapsShortLink(url)
        : url;
    const coordinates = this.coordinatesFromMapUrl(expanded);
    const placeName = this.placeNameFromMapUrl(expanded);
    const query = coordinates
      ? `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({ lat: String(coordinates.latitude), lon: String(coordinates.longitude), format: 'jsonv2', addressdetails: '1' })}`
      : `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: placeName ?? '', format: 'jsonv2', addressdetails: '1', limit: '1' })}`;
    if (!coordinates && !placeName) {
      throw new BadRequestAppException(
        'That Maps link does not expose a place name or map pin. Open the place in Google Maps and copy its full URL.',
      );
    }

    const olaApiKey = process.env.OLA_MAP_API_KEY?.trim();
    if (olaApiKey) {
      return this.geocodeWithOla({ coordinates, placeName, apiKey: olaApiKey });
    }

    const response = await fetch(query, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'RenTrust/0.1 (+https://github.com/asifakhtar18/rentrust)',
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok)
      throw new BadRequestAppException(
        'The map provider could not resolve this place. Try a full Google Maps link.',
      );
    const body = (await response.json()) as NominatimResult | NominatimResult[];
    const result = Array.isArray(body) ? body[0] : body;
    if (!result?.lat || !result.lon) {
      throw new BadRequestAppException(
        'Could not find this place on the map. Check the link or enter the city manually.',
      );
    }

    const address = result.address ?? {};
    const cityName =
      address.city ??
      address.town ??
      address.village ??
      address.municipality ??
      address.county ??
      null;
    const stateName = address.state ?? null;
    const countryName = address.country ?? null;
    const city = cityName
      ? await this.prisma.city.findFirst({
          where: {
            isActive: true,
            name: { equals: cityName, mode: 'insensitive' },
            ...(stateName ? { state: { name: { equals: stateName, mode: 'insensitive' } } } : {}),
          },
          include: { state: { select: { name: true } }, country: { select: { name: true } } },
        })
      : null;
    return {
      latitude: Number(result.lat),
      longitude: Number(result.lon),
      placeName: placeName ?? result.name ?? result.display_name?.split(',')[0],
      localityName: address.suburb ?? address.neighbourhood ?? address.city_district ?? null,
      city: city
        ? {
            id: city.id,
            name: city.name,
            stateName: city.state.name,
            countryName: city.country.name,
          }
        : null,
      resolvedCityName: cityName,
      stateName,
      countryName,
    };
  }

  private async geocodeWithOla(input: {
    coordinates: { latitude: number; longitude: number } | null;
    placeName: string | null;
    apiKey: string;
  }): Promise<ResolvedMapPlace> {
    const endpoint = new URL(
      input.coordinates
        ? 'https://api.olamaps.io/places/v1/reverse-geocode'
        : 'https://api.olamaps.io/places/v1/geocode',
    );
    endpoint.searchParams.set('api_key', input.apiKey);
    if (input.coordinates) {
      endpoint.searchParams.set(
        'latlng',
        `${input.coordinates.latitude},${input.coordinates.longitude}`,
      );
    } else {
      endpoint.searchParams.set('address', input.placeName ?? '');
      endpoint.searchParams.set('language', 'en');
    }

    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      throw new BadRequestAppException(
        'Ola Maps could not resolve this place. Check the map link or choose the city manually.',
      );
    }
    const payload = (await response.json()) as OlaGeocodeResponse;
    const result = (payload.results ?? payload.geocodingResults ?? [])[0];
    const latitude = Number(result?.geometry?.location?.lat);
    const longitude = Number(result?.geometry?.location?.lng);
    if (!result || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new BadRequestAppException(
        'Ola Maps could not find this place. Check the link or enter its city manually.',
      );
    }

    const component = (type: string) =>
      result.address_components?.find((item) => item.types?.includes(type))?.long_name ?? null;
    const cityName =
      component('locality') ??
      component('postal_town') ??
      component('administrative_area_level_2') ??
      component('administrative_area_level_3');
    const stateName = component('administrative_area_level_1');
    const countryName = component('country');
    const localityName =
      component('sublocality_level_1') ??
      component('sublocality') ??
      component('neighborhood') ??
      component('administrative_area_level_3');
    const city = cityName
      ? await this.prisma.city.findFirst({
          where: {
            isActive: true,
            name: { equals: cityName, mode: 'insensitive' },
            ...(stateName
              ? { state: { name: { equals: stateName, mode: 'insensitive' } } }
              : {}),
          },
          include: {
            state: { select: { name: true } },
            country: { select: { name: true } },
          },
        })
      : null;

    return {
      latitude,
      longitude,
      placeName: result.name ?? result.formatted_address?.split(',')[0],
      localityName,
      city: city
        ? {
            id: city.id,
            name: city.name,
            stateName: city.state.name,
            countryName: city.country.name,
          }
        : null,
      resolvedCityName: cityName,
      stateName,
      countryName,
    };
  }

  private async expandGoogleMapsShortLink(url: URL): Promise<URL> {
    let current = url;
    for (let redirect = 0; redirect < 5; redirect += 1) {
      const response = await fetch(current, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(5_000),
      });
      const location = response.headers.get('location');
      if (!location) return current;
      const next = new URL(location, current);
      const host = next.hostname.toLowerCase();
      if (
        next.protocol !== 'https:' ||
        !(
          host === 'google.com' ||
          host.endsWith('.google.com') ||
          host === 'google.co.in' ||
          host.endsWith('.google.co.in') ||
          host === 'goo.gl' ||
          host.endsWith('.goo.gl')
        )
      ) {
        throw new BadRequestAppException('This link does not redirect to Google Maps.');
      }
      current = next;
    }
    return current;
  }

  private coordinatesFromMapUrl(url: URL) {
    const candidates = [
      /@(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/.exec(url.href),
      /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/.exec(url.href),
      /(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/.exec(
        url.searchParams.get('query') ?? url.searchParams.get('q') ?? '',
      ),
    ];
    const pair = candidates.find(Boolean);
    if (!pair) return null;
    const latitude = Number(pair[1]);
    const longitude = Number(pair[2]);
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return { latitude, longitude };
  }

  private placeNameFromMapUrl(url: URL): string | null {
    const match = /^\/maps\/place\/([^/]+)/.exec(url.pathname);
    const pathPlace = match?.[1] ? decodeURIComponent(match[1].replaceAll('+', ' ')) : null;
    const query = url.searchParams.get('query') ?? url.searchParams.get('q');
    const candidate = pathPlace ?? query;
    if (!candidate) return null;
    return candidate.replace(/\s+/g, ' ').replace(/\+/g, ' ').trim().slice(0, 240) || null;
  }

  listCountries(): Promise<Country[]> {
    return this.prisma.country.findMany({ orderBy: { name: 'asc' } });
  }

  listStates(countryId: string): Promise<State[]> {
    return this.prisma.state.findMany({
      where: { countryId },
      orderBy: { name: 'asc' },
    });
  }

  listCities(options?: {
    activeOnly?: boolean;
  }): Promise<Array<City & { state: Pick<State, 'name'>; country: Pick<Country, 'name'> }>> {
    return this.prisma.city.findMany({
      where: options?.activeOnly ? { isActive: true } : undefined,
      include: { state: { select: { name: true } }, country: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getCityBySlug(slug: string): Promise<City> {
    const city = await this.prisma.city.findUnique({ where: { slug } });
    if (!city) {
      throw new NotFoundAppException('City not found', ErrorCode.NOT_FOUND);
    }
    return city;
  }

  listLocalities(cityId?: string): Promise<Locality[]> {
    return this.prisma.locality.findMany({
      where: cityId ? { cityId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async communityStats() {
    const [cities, localities, pendingSuggestions, approvedSuggestions] = await Promise.all([
      this.prisma.city.count({ where: { isActive: true } }),
      this.prisma.locality.count(),
      this.prisma.localitySuggestion.count({ where: { status: LocalitySuggestionStatus.PENDING } }),
      this.prisma.localitySuggestion.count({
        where: { status: LocalitySuggestionStatus.APPROVED },
      }),
    ]);
    return { cities, localities, pendingSuggestions, approvedSuggestions };
  }

  async submitLocalitySuggestion(userId: string, dto: CreateLocalitySuggestionDto) {
    const resolved = dto.googleMapsUrl
      ? await this.resolveGoogleMapsLink({ googleMapsUrl: dto.googleMapsUrl })
      : null;
    if (resolved?.resolvedCityName && !resolved.city) {
      throw new BadRequestAppException(
        `The map link points to ${resolved.resolvedCityName}, which is not in the city catalogue yet. Suggest the city first.`,
      );
    }
    const cityId = resolved?.city?.id ?? dto.cityId;
    const latitude = resolved?.latitude ?? dto.latitude;
    const longitude = resolved?.longitude ?? dto.longitude;
    const city = await this.prisma.city.findFirst({ where: { id: cityId, isActive: true } });
    if (!city) throw new NotFoundAppException('Choose an active city.', ErrorCode.NOT_FOUND);
    if ((latitude === undefined) !== (longitude === undefined)) {
      throw new BadRequestAppException('Add both map coordinates or leave both blank.');
    }

    const name = dto.name.trim().replace(/\s+/g, ' ');
    const normalizedName = this.normalizeLocalityName(name);
    if (normalizedName.length < 2)
      throw new BadRequestAppException('Enter a clearer locality name.');
    const googleMapsUrl = dto.googleMapsUrl?.trim() || undefined;
    if (googleMapsUrl) this.assertGoogleMapsUrl(googleMapsUrl);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${city.id}:${normalizedName}`}, 0))::text`;

        const existing = await tx.locality.findFirst({
          where: { cityId: city.id, name: { equals: name, mode: 'insensitive' } },
          select: { id: true },
        });
        if (existing) {
          throw new ConflictAppException('That locality is already in the catalogue.');
        }

        const pending = await tx.localitySuggestion.findFirst({
          where: { cityId: city.id, normalizedName, status: LocalitySuggestionStatus.PENDING },
          select: { id: true },
        });
        if (pending) {
          throw new ConflictAppException(
            'Someone has already suggested this locality. It is waiting for review.',
          );
        }

        const suggestion = await tx.localitySuggestion.create({
          data: {
            cityId: city.id,
            submitterId: userId,
            name,
            normalizedName,
            description: dto.description?.trim() || null,
            latitude,
            longitude,
            googleMapsUrl,
          },
          select: { id: true, name: true, status: true, createdAt: true },
        });
        return suggestion;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictAppException('This locality is already waiting for review.');
      }
      throw error;
    }
  }

  async listLocalitySuggestions(
    query: OffsetPaginationQuery,
    status = LocalitySuggestionStatus.PENDING,
  ) {
    const where = { status };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.localitySuggestion.count({ where }),
      this.prisma.localitySuggestion.findMany({
        where,
        include: {
          city: { select: { name: true, state: { select: { name: true } } } },
          submitter: { select: { displayName: true } },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async reviewLocalitySuggestion(
    reviewerId: string,
    suggestionId: string,
    dto: ReviewLocalitySuggestionDto,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const suggestion = await tx.localitySuggestion.findFirst({
        where: { id: suggestionId, status: LocalitySuggestionStatus.PENDING },
      });
      if (!suggestion) {
        throw new NotFoundAppException(
          'Pending locality suggestion not found.',
          ErrorCode.NOT_FOUND,
        );
      }

      let locality: Locality | null = null;
      if (dto.decision === 'APPROVED') {
        const existing = await tx.locality.findFirst({
          where: {
            cityId: suggestion.cityId,
            name: { equals: suggestion.name, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (existing)
          throw new ConflictAppException(
            'A matching locality was added while this suggestion was waiting.',
          );

        locality = await tx.locality.create({
          data: {
            cityId: suggestion.cityId,
            name: suggestion.name,
            slug: this.uniqueSlug(suggestion.name),
            description: suggestion.description,
            latitude: suggestion.latitude,
            longitude: suggestion.longitude,
          },
        });
      }

      const status =
        dto.decision === 'APPROVED'
          ? LocalitySuggestionStatus.APPROVED
          : LocalitySuggestionStatus.REJECTED;
      const updated = await tx.localitySuggestion.updateMany({
        where: { id: suggestion.id, status: LocalitySuggestionStatus.PENDING },
        data: {
          status,
          reviewerId,
          moderatorNote: dto.note?.trim() || null,
          reviewedAt: new Date(),
        },
      });
      if (updated.count !== 1)
        throw new ConflictAppException('This suggestion was already reviewed.');
      return { suggestion, status, locality };
    });

    await this.audit.record({
      actorId: reviewerId,
      action: `LOCALITY_SUGGESTION_${result.status}`,
      entityType: 'LocalitySuggestion',
      entityId: suggestionId,
      metadata: { cityId: result.suggestion.cityId, localityId: result.locality?.id },
    });
    return { id: suggestionId, status: result.status, locality: result.locality };
  }

  async getLocalityBySlug(slug: string): Promise<Locality> {
    const locality = await this.prisma.locality.findUnique({ where: { slug } });
    if (!locality) {
      throw new NotFoundAppException('Locality not found', ErrorCode.LOCALITY_NOT_FOUND);
    }
    return locality;
  }

  async getLocalityById(id: string): Promise<Locality> {
    const locality = await this.prisma.locality.findUnique({ where: { id } });
    if (!locality) {
      throw new NotFoundAppException('Locality not found', ErrorCode.LOCALITY_NOT_FOUND);
    }
    return locality;
  }

  async submitLocalityReview(authorId: string, localityId: string, dto: SubmitLocalityReviewDto) {
    await this.getLocalityById(localityId);
    const existing = await this.prisma.localityReview.findFirst({
      where: { authorId, localityId, deletedAt: null, status: { not: 'REMOVED' } },
      select: { id: true },
    });
    if (existing) throw new ConflictAppException('You have already reviewed this area.');
    const ratings = [
      dto.municipalServices,
      dto.publicTransport,
      dto.healthcareAccess,
      dto.foodAndGroceries,
      dto.safety,
      dto.cleanliness,
      dto.neighbourliness,
    ];
    const overall =
      Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10;
    try {
      return await this.prisma.localityReview.create({
        data: {
          localityId,
          authorId,
          tenure: dto.tenure,
          overall,
          answer: {
            create: {
              municipalServices: dto.municipalServices,
              publicTransport: dto.publicTransport,
              healthcareAccess: dto.healthcareAccess,
              foodAndGroceries: dto.foodAndGroceries,
              safety: dto.safety,
              cleanliness: dto.cleanliness,
              neighbourliness: dto.neighbourliness,
              comments: dto.comments?.trim() || null,
            },
          },
        },
        select: { id: true, status: true, createdAt: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictAppException('You have already reviewed this area.');
      }
      throw error;
    }
  }

  async listPublicLocalityReviews(localityId: string) {
    await this.getLocalityById(localityId);
    const reviews = await this.prisma.localityReview.findMany({
      where: { localityId, status: 'PUBLISHED', deletedAt: null },
      include: {
        answer: true,
        author: { select: { residentProfile: { select: { publicAlias: true } } } },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: 30,
    });
    return reviews.map((review) => ({
      id: review.id,
      localityId: review.localityId,
      tenure: review.tenure,
      overall: review.overall,
      authorAlias: review.author.residentProfile?.publicAlias ?? 'Resident',
      ratings: review.answer
        ? {
            municipalServices: review.answer.municipalServices,
            publicTransport: review.answer.publicTransport,
            healthcareAccess: review.answer.healthcareAccess,
            foodAndGroceries: review.answer.foodAndGroceries,
            safety: review.answer.safety,
            cleanliness: review.answer.cleanliness,
            neighbourliness: review.answer.neighbourliness,
          }
        : null,
      comments: review.answer?.comments ?? null,
      publishedAt: review.publishedAt,
    }));
  }

  listMyLocalityReviews(authorId: string) {
    return this.prisma.localityReview.findMany({
      where: { authorId, deletedAt: null },
      include: { locality: { select: { id: true, name: true } }, answer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listLocalityReviewQueue() {
    return this.prisma.localityReview.findMany({
      where: { status: 'PENDING_MODERATION', deletedAt: null },
      include: {
        answer: true,
        locality: {
          select: {
            id: true,
            name: true,
            city: { select: { name: true, state: { select: { name: true } } } },
          },
        },
        author: { select: { displayName: true, email: true } },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 100,
    });
  }

  async decideLocalityReview(reviewerId: string, id: string, dto: DecideLocalityReviewDto) {
    const review = await this.prisma.localityReview.findFirst({
      where: { id, status: 'PENDING_MODERATION', deletedAt: null },
      include: { locality: { select: { name: true } } },
    });
    if (!review)
      throw new NotFoundAppException('Pending area review not found.', ErrorCode.NOT_FOUND);
    const status = dto.decision === 'PUBLISH' ? 'PUBLISHED' : 'REJECTED';
    const updated = await this.prisma.localityReview.updateMany({
      where: { id, status: 'PENDING_MODERATION', deletedAt: null },
      data: { status, publishedAt: status === 'PUBLISHED' ? new Date() : null },
    });
    if (updated.count !== 1)
      throw new ConflictAppException('This area review was already moderated.');
    await this.audit.record({
      actorId: reviewerId,
      action: `LOCALITY_REVIEW_${status}`,
      entityType: 'LocalityReview',
      entityId: id,
      metadata: { localityId: review.localityId, note: dto.note?.trim() || null },
    });
    if (status === 'PUBLISHED') {
      await this.notifications.notify({
        userId: review.authorId,
        type: 'LOCALITY_REVIEW_PUBLISHED',
        title: 'Your area review is live',
        body: `Your review of ${review.locality.name} is now helping residents understand the neighbourhood.`,
        data: { localityId: review.localityId, localityName: review.locality.name },
      });
    }
    return { id, status };
  }

  /**
   * Derived locality intelligence: resident sentiment aggregated from the
   * trust scores of the locality's properties. Everything here comes from real
   * data — when there isn't enough, we say so rather than fabricating numbers.
   */
  async getLocalityIntelligence(id: string) {
    const locality = await this.getLocalityById(id);
    const city = await this.prisma.city.findUnique({
      where: { id: locality.cityId },
      select: { name: true, state: { select: { name: true } } },
    });
    const localitySummary = {
      id: locality.id,
      name: locality.name,
      slug: locality.slug,
      city: city ? { name: city.name, state: { name: city.state.name } } : null,
    };

    const publishedAreaReviews = { localityId: id, status: 'PUBLISHED' as const, deletedAt: null };
    const [areaSummary, areaAnswerSummary] = await Promise.all([
      this.prisma.localityReview.aggregate({
        where: publishedAreaReviews,
        _avg: { overall: true },
        _count: { _all: true },
      }),
      this.prisma.localityReviewAnswer.aggregate({
        where: { review: { is: publishedAreaReviews } },
        _avg: {
          municipalServices: true,
          publicTransport: true,
          healthcareAccess: true,
          foodAndGroceries: true,
          safety: true,
          cleanliness: true,
          neighbourliness: true,
        },
      }),
    ]);
    const areaExperience = {
      reviewCount: areaSummary._count._all,
      overallAverage:
        areaSummary._avg.overall === null ? null : Math.round(areaSummary._avg.overall * 10) / 10,
      categoryAverages: Object.fromEntries(
        Object.entries(areaAnswerSummary._avg)
          .filter((entry): entry is [string, number] => entry[1] !== null)
          .map(([key, value]) => [key, Math.round(value * 10) / 10]),
      ),
    };

    const properties = await this.prisma.property.findMany({
      where: { localityId: id, deletedAt: null, status: 'ACTIVE' },
      include: { score: true },
    });
    const scored = properties.filter((p) => p.score !== null);
    const propertyCount = properties.length;

    if (scored.length === 0) {
      return {
        locality: localitySummary,
        propertyCount,
        hasEnoughData: false,
        message: 'Not enough verified resident data yet.',
        areaExperience,
      };
    }

    // Average the per-category scores across scored properties.
    const categoryTotals = new Map<string, { sum: number; n: number }>();
    const positive = new Map<string, number>();
    const negative = new Map<string, number>();
    let overallSum = 0;
    let sampleTotal = 0;

    for (const p of scored) {
      const score = p.score!;
      overallSum += score.overall;
      sampleTotal += score.sampleSize;
      const cats = score.categoryScores as Record<string, { score: number }>;
      for (const [key, val] of Object.entries(cats)) {
        const cur = categoryTotals.get(key) ?? { sum: 0, n: 0 };
        cur.sum += val.score;
        cur.n += 1;
        categoryTotals.set(key, cur);
      }
      for (const t of score.positiveThemes) positive.set(t, (positive.get(t) ?? 0) + 1);
      for (const t of score.negativeThemes) negative.set(t, (negative.get(t) ?? 0) + 1);
    }

    const categoryAverages: Record<string, number> = {};
    for (const [key, { sum, n }] of categoryTotals) {
      categoryAverages[key] = Math.round(sum / n);
    }

    const topThemes = (m: Map<string, number>) =>
      [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([t]) => t);

    return {
      locality: localitySummary,
      propertyCount,
      scoredPropertyCount: scored.length,
      totalReviews: sampleTotal,
      hasEnoughData: true,
      averageTrustScore: Math.round(overallSum / scored.length),
      categoryAverages,
      commonPositiveThemes: topThemes(positive),
      commonComplaints: topThemes(negative),
      areaExperience,
    };
  }

  async createCity(dto: CreateCityDto): Promise<City> {
    const state = await this.prisma.state.findUnique({ where: { id: dto.stateId } });
    if (!state) {
      throw new NotFoundAppException('State not found', ErrorCode.NOT_FOUND);
    }
    try {
      return await this.prisma.city.create({
        data: {
          stateId: state.id,
          countryId: state.countryId,
          name: dto.name,
          slug: this.uniqueSlug(dto.name),
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
        },
      });
    } catch (err) {
      throw this.mapUniqueError(err, 'A city with this name already exists in the state.');
    }
  }

  async createLocality(dto: CreateLocalityDto): Promise<Locality> {
    const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } });
    if (!city) {
      throw new NotFoundAppException('City not found', ErrorCode.NOT_FOUND);
    }
    try {
      return await this.prisma.locality.create({
        data: {
          cityId: city.id,
          name: dto.name,
          slug: this.uniqueSlug(dto.name),
          description: dto.description ?? null,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
        },
      });
    } catch (err) {
      throw this.mapUniqueError(err, 'A locality with this name already exists in the city.');
    }
  }

  private uniqueSlug(name: string): string {
    // Append a short random suffix to avoid cross-city slug collisions while
    // keeping the slug readable.
    return `${slugify(name)}-${randomBytes(2).toString('hex')}`;
  }

  private normalizeLocalityName(name: string): string {
    return name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('en-IN')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  }

  private assertGoogleMapsUrl(value: string): void {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestAppException('Enter a valid Google Maps link.');
    }
    const host = url.hostname.toLowerCase();
    const allowed =
      host === 'goo.gl' ||
      host.endsWith('.goo.gl') ||
      host === 'google.com' ||
      host.endsWith('.google.com') ||
      host === 'google.co.in' ||
      host.endsWith('.google.co.in');
    if (url.protocol !== 'https:' || !allowed || url.username || url.password) {
      throw new BadRequestAppException('Use a secure Google Maps link.');
    }
  }

  private mapUniqueError(err: unknown, message: string): Error {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return new ConflictAppException(message, ErrorCode.CONFLICT);
    }
    return err instanceof Error ? err : new Error('Unknown error');
  }
}
