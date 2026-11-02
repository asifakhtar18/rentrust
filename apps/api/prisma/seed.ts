/* eslint-disable no-console */
/**
 * Development seed data for RenTrust.
 *
 * ⚠️  ALL DATA HERE IS FICTIONAL and for local development only. Property
 * names, landlords, and reviews are invented. Do NOT run this against a
 * production database — resident reviews must be real, verified submissions.
 *
 * Seeds: Bengaluru geography, 5 localities, 10 landlords, 5 managers,
 * 20 properties, and 100 published reviews, then computes trust scores.
 *
 * Idempotency: the seed clears previously-seeded fictional rows (by a marker)
 * before inserting, so it can be run repeatedly.
 */
import {
  DepositOutcome,
  MaintenanceResolutionBucket,
  PrismaClient,
  PropertyType,
  ReviewStatus,
  TenureBucket,
  TriState,
  YesNoNa,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PasswordService } from '../src/auth/services/password.service';
import { categoryScoresForReview } from '../src/reviews/review-scoring';
import { REVIEW_CATEGORY_KEYS } from '../src/reviews/review.constants';
import { DEFAULT_SCORE_WEIGHTS } from '../src/trust-score/trust-score.engine';

const prisma = new PrismaClient();

const SEED_TAG = '[seed]'; // marker stored in descriptions / aliases for cleanup

const LOCALITIES = [
  { name: 'HSR Layout', lat: 12.9116, lng: 77.6389 },
  { name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  { name: 'Bellandur', lat: 12.9304, lng: 77.6784 },
  { name: 'Whitefield', lat: 12.9698, lng: 77.7499 },
  { name: 'Marathahalli', lat: 12.9569, lng: 77.7011 },
];

const PROPERTY_TYPES: PropertyType[] = [
  PropertyType.APARTMENT,
  PropertyType.PG,
  PropertyType.CO_LIVING,
  PropertyType.VILLA,
  PropertyType.BUILDER_PROPERTY,
];

const ADJECTIVES = ['Prestige', 'Brigade', 'Sobha', 'Purva', 'Mantri', 'Salarpuria', 'Nitesh'];
const NOUNS = ['Lakeside', 'Serenity', 'Habitat', 'Greens', 'Pinnacle', 'Residency', 'Heights', 'Enclave'];

const LIKED = ['spacious', 'well_maintained', 'safe_neighbourhood', 'good_water_supply', 'quiet', 'great_location'];
const DISLIKED = ['poor_maintenance', 'water_issues', 'noisy', 'deposit_disputes', 'parking_issues'];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function clearSeed(): Promise<void> {
  // Remove previously-seeded data in FK-safe order using the marker.
  const seeded = await prisma.property.findMany({
    where: { description: { contains: SEED_TAG } },
    select: { id: true },
  });
  const ids = seeded.map((p) => p.id);
  if (ids.length > 0) {
    await prisma.review.deleteMany({ where: { propertyId: { in: ids } } });
    await prisma.propertyScore.deleteMany({ where: { propertyId: { in: ids } } });
    await prisma.propertyLandlord.deleteMany({ where: { propertyId: { in: ids } } });
    await prisma.propertyManagerLink.deleteMany({ where: { propertyId: { in: ids } } });
    await prisma.property.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.landlord.deleteMany({ where: { aliases: { has: SEED_TAG } } });
  await prisma.propertyManager.deleteMany({ where: { company: SEED_TAG } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@seed.rentrust.local' } } });
}

/** Computes and upserts PropertyScore for each property from its reviews. */
async function computeScores(propertyIds: string[]): Promise<void> {
  const threshold = 30;
  const k = Math.max(1, threshold / 3);
  for (const propertyId of propertyIds) {
    const reviews = await prisma.review.findMany({
      where: { propertyId, status: ReviewStatus.PUBLISHED, deletedAt: null },
      include: { answer: true },
    });
    if (reviews.length === 0) continue;

    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    const liked = new Map<string, number>();
    const disliked = new Map<string, number>();
    for (const key of REVIEW_CATEGORY_KEYS) {
      sums[key] = 0;
      counts[key] = 0;
    }
    for (const r of reviews) {
      if (!r.answer) continue;
      const per = categoryScoresForReview(r.answer);
      for (const key of REVIEW_CATEGORY_KEYS) {
        sums[key] += per[key];
        counts[key] += 1;
      }
      for (const t of r.answer.likedTags) liked.set(t, (liked.get(t) ?? 0) + 1);
      for (const t of r.answer.dislikedTags) disliked.set(t, (disliked.get(t) ?? 0) + 1);
    }

    const categoryScores: Record<string, { score: number; sampleSize: number }> = {};
    let weightedTotal = 0;
    let weightSum = 0;
    for (const key of REVIEW_CATEGORY_KEYS) {
      const avg = counts[key] > 0 ? sums[key] / counts[key] : 0;
      categoryScores[key] = { score: Math.round(avg), sampleSize: counts[key] };
      const w = DEFAULT_SCORE_WEIGHTS[key];
      weightedTotal += avg * w;
      weightSum += w;
    }
    const overall = weightSum > 0 ? Math.round(weightedTotal / weightSum) : 0;
    const confidence = Math.min(1, Math.round((1 - Math.exp(-reviews.length / k)) * 100) / 100);
    const top = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);

    await prisma.propertyScore.upsert({
      where: { propertyId },
      create: {
        propertyId,
        overall,
        sampleSize: reviews.length,
        confidence,
        categoryScores,
        positiveThemes: top(liked),
        negativeThemes: top(disliked),
        lastCalculatedAt: new Date(),
      },
      update: {
        overall,
        sampleSize: reviews.length,
        confidence,
        categoryScores,
        positiveThemes: top(liked),
        negativeThemes: top(disliked),
        lastCalculatedAt: new Date(),
      },
    });
  }
}

async function main(): Promise<void> {
  console.log('Seeding RenTrust development data (FICTIONAL)...');
  await clearSeed();

  // Geography
  const country = await prisma.country.upsert({
    where: { iso2: 'IN' },
    update: {},
    create: { name: 'India', iso2: 'IN' },
  });
  const state =
    (await prisma.state.findFirst({ where: { countryId: country.id, name: 'Karnataka' } })) ??
    (await prisma.state.create({ data: { countryId: country.id, name: 'Karnataka', code: 'KA' } }));
  const city =
    (await prisma.city.findFirst({ where: { stateId: state.id, name: 'Bengaluru' } })) ??
    (await prisma.city.create({
      data: {
        stateId: state.id,
        countryId: country.id,
        name: 'Bengaluru',
        slug: 'bengaluru',
        latitude: 12.9716,
        longitude: 77.5946,
      },
    }));

  const localities = [];
  for (const l of LOCALITIES) {
    const existing = await prisma.locality.findFirst({ where: { cityId: city.id, name: l.name } });
    localities.push(
      existing ??
        (await prisma.locality.create({
          data: {
            cityId: city.id,
            name: l.name,
            slug: `${l.name.toLowerCase().replace(/\s+/g, '-')}-blr`,
            latitude: l.lat,
            longitude: l.lng,
            description: `${l.name}, Bengaluru. ${SEED_TAG}`,
          },
        })),
    );
  }

  // Landlords (10) & managers (5)
  const landlords = [];
  for (let i = 0; i < 10; i++) {
    landlords.push(
      await prisma.landlord.create({
        data: {
          displayName: `${pick(ADJECTIVES, i)} Holdings ${i + 1}`,
          slug: `landlord-${randomUUID().slice(0, 8)}`,
          aliases: [SEED_TAG],
          isCompany: i % 2 === 0,
        },
      }),
    );
  }
  const managers = [];
  for (let i = 0; i < 5; i++) {
    managers.push(
      await prisma.propertyManager.create({
        data: {
          displayName: `${pick(NOUNS, i)} Facility Mgmt`,
          slug: `manager-${randomUUID().slice(0, 8)}`,
          company: SEED_TAG,
        },
      }),
    );
  }

  // Properties (20)
  const properties = [];
  for (let i = 0; i < 20; i++) {
    const locality = pick(localities, i);
    const displayName = `${pick(ADJECTIVES, i)} ${pick(NOUNS, i + 3)} ${i + 1}`;
    const jitter = (base: number) => base + (Math.random() - 0.5) * 0.02;
    const property = await prisma.property.create({
      data: {
        canonicalName: displayName.toLowerCase(),
        displayName,
        slug: `prop-${randomUUID().slice(0, 8)}`,
        aliases: [displayName.split(' ').slice(0, 2).join(' ')],
        propertyType: pick(PROPERTY_TYPES, i),
        localityId: locality.id,
        latitude: jitter(locality.latitude ?? 12.97),
        longitude: jitter(locality.longitude ?? 77.6),
        developer: pick(ADJECTIVES, i) + ' Developers',
        yearBuilt: rand(2008, 2022),
        amenities: ['Pool', 'Gym', 'Clubhouse', 'Power Backup'].slice(0, rand(1, 4)),
        description: `A fictional ${pick(PROPERTY_TYPES, i)} in ${locality.name}. ${SEED_TAG}`,
        isClaimed: i % 5 === 0,
      },
    });
    // Link a landlord and sometimes a manager.
    await prisma.propertyLandlord.create({
      data: { propertyId: property.id, landlordId: pick(landlords, i).id },
    });
    if (i % 2 === 0) {
      await prisma.propertyManagerLink.create({
        data: { propertyId: property.id, managerId: pick(managers, i).id },
      });
    }
    properties.push(property);
  }

  // Reviewers (shared pool) + 100 published reviews
  const passwordHash = await new PasswordService().hash('Str0ngPassphrase1');
  const reviewers = [];
  for (let i = 0; i < 40; i++) {
    reviewers.push(
      await prisma.user.create({
        data: {
          email: `reviewer_${i}@seed.rentrust.local`,
          passwordHash,
          emailVerifiedAt: new Date(),
          residentProfile: { create: { publicAlias: `Verified Resident #${randomUUID().slice(0, 4).toUpperCase()}` } },
        },
      }),
    );
  }

  const tenures = Object.values(TenureBucket);
  const resolutions = Object.values(MaintenanceResolutionBucket);
  let created = 0;
  const usedPairs = new Set<string>();
  while (created < 100) {
    const property = pick(properties, rand(0, properties.length - 1));
    const reviewer = pick(reviewers, rand(0, reviewers.length - 1));
    const pairKey = `${reviewer.id}:${property.id}`;
    if (usedPairs.has(pairKey)) continue; // one active review per author+property
    usedPairs.add(pairKey);

    const quality = rand(2, 5);
    await prisma.review.create({
      data: {
        propertyId: property.id,
        authorId: reviewer.id,
        status: ReviewStatus.PUBLISHED,
        isVerified: quality >= 4,
        tenure: pick(tenures, rand(0, tenures.length - 1)),
        overall: quality * 20,
        publishedAt: new Date(Date.now() - rand(0, 300) * 86_400_000),
        answer: {
          create: {
            tenure: pick(tenures, rand(0, tenures.length - 1)),
            managementResponsiveness: quality,
            maintenanceQuality: quality,
            maintenanceResolution: pick(resolutions, rand(0, resolutions.length - 1)),
            depositOutcome: quality >= 4 ? DepositOutcome.FULL : DepositOutcome.PARTIAL,
            deductionsExplained: quality >= 4 ? YesNoNa.YES : YesNoNa.NO,
            communication: quality,
            safety: rand(2, 5),
            waterSupply: rand(2, 5),
            internet: rand(2, 5),
            noise: rand(2, 5),
            rulesStrictness: rand(1, 5),
            wouldRentAgain: quality >= 4 ? TriState.YES : TriState.MAYBE,
            wouldRecommend: quality >= 4,
            likedTags: [pick(LIKED, rand(0, LIKED.length - 1))],
            dislikedTags: quality < 4 ? [pick(DISLIKED, rand(0, DISLIKED.length - 1))] : [],
            comments: `Fictional seed review (quality ${quality}). ${SEED_TAG}`,
          },
        },
      },
    });
    created++;
  }

  // Compute trust scores so seed data is immediately useful. Mirrors the
  // TrustScoreEngine aggregation (weighted mean + confidence by sample size).
  await computeScores(properties.map((p) => p.id));

  console.log(
    `Seeded: ${localities.length} localities, ${landlords.length} landlords, ${managers.length} managers, ${properties.length} properties, ${created} reviews, and trust scores.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
