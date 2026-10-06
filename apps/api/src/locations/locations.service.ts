import { Injectable } from '@nestjs/common';
import { City, Country, Locality, Prisma, State } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { ConflictAppException, NotFoundAppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { slugify } from '../common/util/slug.util';
import { CreateCityDto, CreateLocalityDto } from './dto/location.dto';

/**
 * Owns geography reference data: countries, states, cities, localities. Cities
 * and localities carry coordinates whose geometry column is maintained by DB
 * triggers (see migration), so writes here only set lat/lng.
 */
@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  listCountries(): Promise<Country[]> {
    return this.prisma.country.findMany({ orderBy: { name: 'asc' } });
  }

  listStates(countryId: string): Promise<State[]> {
    return this.prisma.state.findMany({
      where: { countryId },
      orderBy: { name: 'asc' },
    });
  }

  listCities(options?: { activeOnly?: boolean }): Promise<City[]> {
    return this.prisma.city.findMany({
      where: options?.activeOnly ? { isActive: true } : undefined,
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

  /**
   * Derived locality intelligence: resident sentiment aggregated from the
   * trust scores of the locality's properties. Everything here comes from real
   * data — when there isn't enough, we say so rather than fabricating numbers.
   */
  async getLocalityIntelligence(id: string) {
    const locality = await this.getLocalityById(id);

    const properties = await this.prisma.property.findMany({
      where: { localityId: id, deletedAt: null, status: 'ACTIVE' },
      include: { score: true },
    });
    const scored = properties.filter((p) => p.score !== null);
    const propertyCount = properties.length;

    if (scored.length === 0) {
      return {
        locality: { id: locality.id, name: locality.name, slug: locality.slug },
        propertyCount,
        hasEnoughData: false,
        message: 'Not enough verified resident data yet.',
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
      locality: { id: locality.id, name: locality.name, slug: locality.slug },
      propertyCount,
      scoredPropertyCount: scored.length,
      totalReviews: sampleTotal,
      hasEnoughData: true,
      averageTrustScore: Math.round(overallSum / scored.length),
      categoryAverages,
      commonPositiveThemes: topThemes(positive),
      commonComplaints: topThemes(negative),
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

  private mapUniqueError(err: unknown, message: string): Error {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return new ConflictAppException(message, ErrorCode.CONFLICT);
    }
    return err instanceof Error ? err : new Error('Unknown error');
  }
}
