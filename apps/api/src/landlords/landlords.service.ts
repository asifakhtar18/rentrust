import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotFoundAppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { MIN_VERIFIED_REVIEWS_FOR_LANDLORD_SCORE } from './landlord-profile.constants';

@Injectable()
export class LandlordsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(id: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        landlord_id: string;
        display_name: string;
        is_company: boolean;
        property_id: string | null;
        property_name: string | null;
        property_slug: string | null;
        locality_name: string | null;
        city_name: string | null;
        review_count: number;
        average_overall: number | null;
      }>
    >`
      SELECT la.id AS landlord_id, la.display_name, la.is_company,
        p.id AS property_id, p.display_name AS property_name, p.slug AS property_slug,
        lo.name AS locality_name, c.name AS city_name,
        COUNT(r.id)::int AS review_count, AVG(r.overall)::float8 AS average_overall
      FROM landlords la
      LEFT JOIN property_landlords pl ON pl.landlord_id = la.id
      LEFT JOIN properties p ON p.id = pl.property_id
        AND p.deleted_at IS NULL AND p.status = 'ACTIVE'
      LEFT JOIN localities lo ON lo.id = p.locality_id
      LEFT JOIN cities c ON c.id = lo.city_id
      LEFT JOIN reviews r ON r.property_id = p.id
        AND r.status = 'PUBLISHED' AND r.deleted_at IS NULL AND r.is_verified = true
        AND r.overall IS NOT NULL
      WHERE la.id = ${id} AND la.deleted_at IS NULL
      GROUP BY la.id, p.id, p.display_name, p.slug, lo.name, c.name
      ORDER BY p.display_name ASC
    `;

    if (rows.length === 0) {
      throw new NotFoundAppException('Landlord not found', ErrorCode.NOT_FOUND);
    }

    const properties = rows
      .filter(
        (
          row,
        ): row is typeof row & {
          property_id: string;
          property_name: string;
          property_slug: string;
        } => row.property_id !== null && row.property_name !== null && row.property_slug !== null,
      )
      .map((row) => ({
        id: row.property_id,
        displayName: row.property_name,
        slug: row.property_slug,
        localityName: row.locality_name,
        cityName: row.city_name,
        verifiedReviewCount: Number(row.review_count),
        averageOverall:
          row.average_overall === null ? null : Math.round(Number(row.average_overall)),
      }));
    const verifiedReviewCount = properties.reduce(
      (sum, property) => sum + property.verifiedReviewCount,
      0,
    );
    const weightedOverall = rows.reduce(
      (sum, row) =>
        sum +
        (row.average_overall === null ? 0 : Number(row.average_overall) * Number(row.review_count)),
      0,
    );
    const hasEnoughData = verifiedReviewCount >= MIN_VERIFIED_REVIEWS_FOR_LANDLORD_SCORE;

    return {
      landlord: {
        id: rows[0].landlord_id,
        displayName: rows[0].display_name,
        isCompany: rows[0].is_company,
      },
      propertyCount: properties.length,
      verifiedReviewCount,
      hasEnoughData,
      averageOverall: hasEnoughData ? Math.round(weightedOverall / verifiedReviewCount) : null,
      minimumReviewsForScore: MIN_VERIFIED_REVIEWS_FOR_LANDLORD_SCORE,
      properties,
    };
  }
}
