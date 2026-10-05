import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { REVIEW_CATEGORY_KEYS } from '../reviews/review.constants';
import { DEFAULT_CONFIG_NAME, DEFAULT_SCORE_WEIGHTS } from './trust-score.engine';

const CATEGORY_LABELS: Record<string, string> = {
  management: 'Management',
  maintenance: 'Maintenance',
  deposit: 'Deposit Experience',
  communication: 'Communication',
  safety: 'Safety',
  condition: 'Property Condition',
  rules: 'Rules Transparency',
  experience: 'Living Experience',
};

/**
 * Idempotently ensures the system reference data exists: the review categories
 * and a single active default ScoreConfiguration. This is bootstrap data (not
 * fictional seed data), so it runs on startup and is safe to run repeatedly.
 */
@Injectable()
export class ReferenceDataService implements OnModuleInit {
  private readonly logger = new Logger(ReferenceDataService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureReferenceData();
  }

  async ensureReferenceData(): Promise<void> {
    await this.ensureCategories();
    await this.ensureDefaultScoreConfig();
  }

  private async ensureCategories(): Promise<void> {
    for (let i = 0; i < REVIEW_CATEGORY_KEYS.length; i++) {
      const key = REVIEW_CATEGORY_KEYS[i];
      await this.prisma.reviewCategory.upsert({
        where: { key },
        update: { label: CATEGORY_LABELS[key] ?? key, displayOrder: i },
        create: { key, label: CATEGORY_LABELS[key] ?? key, displayOrder: i, isActive: true },
      });
    }
  }

  private async ensureDefaultScoreConfig(): Promise<void> {
    const existing = await this.prisma.scoreConfiguration.findUnique({
      where: { name: DEFAULT_CONFIG_NAME },
    });
    if (existing) {
      return;
    }
    const anyActive = await this.prisma.scoreConfiguration.findFirst({ where: { isActive: true } });
    await this.prisma.scoreConfiguration.create({
      data: {
        name: DEFAULT_CONFIG_NAME,
        // Only mark active if nothing else already is (single-active constraint).
        isActive: !anyActive,
        weights: DEFAULT_SCORE_WEIGHTS,
      },
    });
    this.logger.log('Seeded default trust-score configuration');
  }
}
