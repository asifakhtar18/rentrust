import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PropertiesService } from '../properties/properties.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { BadRequestAppException } from '../common/errors/app.exception';

/**
 * Resident engagement: saved properties and side-by-side comparison. Kept in
 * its own module so the Property domain stays focused on canonical property
 * data while these user-centric features compose property + score services.
 */
@Injectable()
export class EngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly properties: PropertiesService,
    private readonly trustScore: TrustScoreService,
  ) {}

  async save(userId: string, propertyId: string): Promise<void> {
    const property = await this.properties.getById(propertyId);
    await this.prisma.savedProperty.upsert({
      where: { userId_propertyId: { userId, propertyId: property.id } },
      create: { userId, propertyId: property.id },
      update: {},
    });
  }

  async unsave(userId: string, propertyId: string): Promise<void> {
    await this.prisma.savedProperty.deleteMany({ where: { userId, propertyId } });
  }

  async listSaved(userId: string) {
    const saved = await this.prisma.savedProperty.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { property: true },
    });
    const withScores = await Promise.all(
      saved
        .filter((s) => s.property.deletedAt === null)
        .map(async (s) => ({
          ...this.properties.toPublic(s.property),
          score: await this.trustScore.getScore(s.property.id),
          savedAt: s.createdAt,
        })),
    );
    return withScores;
  }

  /**
   * Compares 2-4 properties side by side on their trust scores and category
   * breakdowns. Only verified data is surfaced; properties without enough data
   * are returned with the "not enough data" marker rather than a fake number.
   */
  async compare(propertyIds: string[]) {
    const unique = [...new Set(propertyIds)];
    if (unique.length < 2 || unique.length > 4) {
      throw new BadRequestAppException('Compare between 2 and 4 properties.');
    }
    return Promise.all(
      unique.map(async (id) => {
        const property = await this.properties.getById(id);
        const score = await this.trustScore.getScore(property.id);
        return { property: this.properties.toPublic(property), score };
      }),
    );
  }
}
