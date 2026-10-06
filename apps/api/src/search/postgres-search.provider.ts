import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SearchHit, SearchProvider, SearchQuery, SearchResult } from './search.interface';

interface RawPropertyHit {
  id: string;
  display_name: string;
  slug: string;
  property_type: string;
  locality_name: string | null;
  relevance: number;
  distance_meters: number | null;
}

interface RawLandlordHit {
  id: string;
  display_name: string;
  slug: string;
  is_company: boolean;
  relevance: number;
}

interface RawLocalityHit {
  id: string;
  name: string;
  slug: string;
  city_name: string;
  relevance: number;
}

/**
 * PostgreSQL-backed search. Blends three signals so results feel natural:
 *  - Full-text (search_vector @@ plainto_tsquery) for token/stemmed matches.
 *  - Trigram similarity (pg_trgm) for fuzzy/typo tolerance and prefix matches.
 *  - Alias array overlap for known alternate names.
 * Optional PostGIS distance adds a geo signal/filter. All inputs are bound as
 * parameters (injection-safe). Explicit column selection avoids deserialising
 * geometry/tsvector columns Prisma can't map.
 */
@Injectable()
export class PostgresSearchProvider implements SearchProvider {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchQuery): Promise<SearchResult> {
    const types = query.types ?? ['property', 'landlord', 'locality'];
    const term = query.q.trim();
    if (term.length === 0) {
      return { query: term, hits: [] };
    }

    const tasks: Array<Promise<SearchHit[]>> = [];
    if (types.includes('property')) tasks.push(this.searchProperties(term, query));
    if (types.includes('landlord')) tasks.push(this.searchLandlords(term, query.limit));
    if (types.includes('locality')) tasks.push(this.searchLocalities(term, query.limit));

    const groups = await Promise.all(tasks);
    const hits = groups
      .flat()
      .sort((a, b) => {
        // When a geo query is present, prefer closer results on ties.
        if (b.relevance !== a.relevance) return b.relevance - a.relevance;
        return (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity);
      })
      .slice(0, query.limit);

    return { query: term, hits };
  }

  private async searchProperties(term: string, query: SearchQuery): Promise<SearchHit[]> {
    const hasGeo = typeof query.latitude === 'number' && typeof query.longitude === 'number';
    const geoPoint = hasGeo
      ? Prisma.sql`ST_SetSRID(ST_MakePoint(${query.longitude}, ${query.latitude}), 4326)::geography`
      : Prisma.sql`NULL`;
    const radius = query.radiusMeters ?? null;

    // relevance = ts_rank + trigram similarity on names + alias overlap boost.
    const rows = await this.prisma.$queryRaw<RawPropertyHit[]>(Prisma.sql`
      SELECT
        p.id,
        p.display_name,
        p.slug,
        p.property_type,
        l.name AS locality_name,
        (
          COALESCE(ts_rank(p.search_vector, plainto_tsquery('simple', ${term})), 0)
          + GREATEST(
              similarity(p.display_name, ${term}),
              similarity(p.canonical_name, ${term})
            )
          + CASE WHEN EXISTS (
              SELECT 1 FROM unnest(p.aliases) a
              WHERE a ILIKE ${'%' + term + '%'}
            ) THEN 0.5 ELSE 0 END
        )::float8 AS relevance,
        CASE WHEN ${hasGeo} AND p.geom IS NOT NULL
          THEN ST_Distance(p.geom::geography, ${geoPoint})::float8
          ELSE NULL END AS distance_meters
      FROM properties p
      LEFT JOIN localities l ON l.id = p.locality_id
      WHERE p.deleted_at IS NULL
        AND p.status = 'ACTIVE'
        AND (
          p.search_vector @@ plainto_tsquery('simple', ${term})
          OR p.display_name ILIKE ${'%' + term + '%'}
          OR p.canonical_name % ${term}
          OR EXISTS (SELECT 1 FROM unnest(p.aliases) a WHERE a ILIKE ${'%' + term + '%'})
        )
        AND (
          ${!hasGeo} OR ${radius}::float8 IS NULL OR
          (p.geom IS NOT NULL AND ST_DWithin(p.geom::geography, ${geoPoint}, ${radius}))
        )
      ORDER BY relevance DESC
      LIMIT ${query.limit}
    `);

    return rows.map((r) => ({
      type: 'property' as const,
      id: r.id,
      title: r.display_name,
      subtitle: r.locality_name ?? undefined,
      slug: r.slug,
      relevance: r.relevance,
      distanceMeters: r.distance_meters ?? undefined,
      meta: { propertyType: r.property_type },
    }));
  }

  private async searchLandlords(term: string, limit: number): Promise<SearchHit[]> {
    const rows = await this.prisma.$queryRaw<RawLandlordHit[]>(Prisma.sql`
      SELECT
        la.id, la.display_name, la.slug, la.is_company,
        (
          similarity(la.display_name, ${term})
          + CASE WHEN EXISTS (
              SELECT 1 FROM unnest(la.aliases) a WHERE a ILIKE ${'%' + term + '%'}
            ) THEN 0.5 ELSE 0 END
        )::float8 AS relevance
      FROM landlords la
      WHERE la.deleted_at IS NULL
        AND (
          la.display_name ILIKE ${'%' + term + '%'}
          OR la.display_name % ${term}
          OR EXISTS (SELECT 1 FROM unnest(la.aliases) a WHERE a ILIKE ${'%' + term + '%'})
        )
      ORDER BY relevance DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      type: 'landlord' as const,
      id: r.id,
      title: r.display_name,
      subtitle: r.is_company ? 'Company' : 'Individual',
      slug: r.slug,
      relevance: r.relevance,
    }));
  }

  private async searchLocalities(term: string, limit: number): Promise<SearchHit[]> {
    const rows = await this.prisma.$queryRaw<RawLocalityHit[]>(Prisma.sql`
      SELECT
        lo.id, lo.name, lo.slug, c.name AS city_name,
        similarity(lo.name, ${term})::float8 AS relevance
      FROM localities lo
      JOIN cities c ON c.id = lo.city_id
      WHERE lo.name ILIKE ${'%' + term + '%'} OR lo.name % ${term}
      ORDER BY relevance DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      type: 'locality' as const,
      id: r.id,
      title: r.name,
      subtitle: r.city_name,
      slug: r.slug,
      relevance: r.relevance,
    }));
  }
}
