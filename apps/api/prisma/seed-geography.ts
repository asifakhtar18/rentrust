import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { PrismaClient } from '@prisma/client';
import { slugify } from '../src/common/util/slug.util';

interface IndiaPlace {
  city: string;
  lat: string;
  lng: string;
  country: string;
  iso2: string;
  admin_name: string;
}

const STATE_MASTER = [
  ['Andhra Pradesh', 'AP'],
  ['Arunachal Pradesh', 'AR'],
  ['Assam', 'AS'],
  ['Bihar', 'BR'],
  ['Chhattisgarh', 'CG'],
  ['Goa', 'GA'],
  ['Gujarat', 'GJ'],
  ['Haryana', 'HR'],
  ['Himachal Pradesh', 'HP'],
  ['Jharkhand', 'JH'],
  ['Karnataka', 'KA'],
  ['Kerala', 'KL'],
  ['Madhya Pradesh', 'MP'],
  ['Maharashtra', 'MH'],
  ['Manipur', 'MN'],
  ['Meghalaya', 'ML'],
  ['Mizoram', 'MZ'],
  ['Nagaland', 'NL'],
  ['Odisha', 'OD'],
  ['Punjab', 'PB'],
  ['Rajasthan', 'RJ'],
  ['Sikkim', 'SK'],
  ['Tamil Nadu', 'TN'],
  ['Telangana', 'TG'],
  ['Tripura', 'TR'],
  ['Uttar Pradesh', 'UP'],
  ['Uttarakhand', 'UK'],
  ['West Bengal', 'WB'],
  ['Andaman and Nicobar Islands', 'AN'],
  ['Chandigarh', 'CH'],
  ['Dadra and Nagar Haveli and Daman and Diu', 'DH'],
  ['Delhi', 'DL'],
  ['Jammu and Kashmir', 'JK'],
  ['Ladakh', 'LA'],
  ['Lakshadweep', 'LD'],
  ['Puducherry', 'PY'],
] as const;

const CITY_NAME_ALIASES: Record<string, string> = {
  bangalore: 'Bengaluru',
  mysore: 'Mysuru',
  calcutta: 'Kolkata',
};

function plainName(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizedName(value: string): string {
  return plainName(value).toLocaleLowerCase('en-IN');
}

async function main() {
  // Load the API-local environment first, then fill missing keys from the
  // repository root. Existing shell variables always take precedence.
  for (const path of [resolve(__dirname, '../.env.local'), resolve(__dirname, '../../.env.local')]) {
    if (existsSync(path)) loadEnvFile(path);
  }

  const dataPath = resolve(__dirname, '../../../in.json');
  if (!existsSync(dataPath)) throw new Error(`India city data file was not found at ${dataPath}`);

  const rows = JSON.parse(readFileSync(dataPath, 'utf8')) as IndiaPlace[];
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('in.json contains no city records.');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url:
          process.env.DATABASE_URL ??
          process.env.POSTGRES_PRISMA_URL ??
          process.env.POSTGRES_URL ??
          process.env.POSTGRES_URL_NON_POOLING,
      },
    },
  });

  try {
    const country = await prisma.country.upsert({
      where: { iso2: 'IN' },
      create: { iso2: 'IN', name: 'India' },
      update: { name: 'India' },
    });

    const stateByName = new Map<string, string>();
    for (const [name, code] of STATE_MASTER) {
      const state = await prisma.state.upsert({
        where: { countryId_name: { countryId: country.id, name } },
        create: { countryId: country.id, name, code },
        update: { code },
      });
      stateByName.set(normalizedName(name), state.id);
    }

    const existingCities = await prisma.city.findMany({
      where: { countryId: country.id },
      select: { id: true, name: true, slug: true, stateId: true, latitude: true, longitude: true },
    });
    const cityLookup = new Map(
      existingCities.map((city) => [`${city.stateId}:${normalizedName(city.name)}`, city]),
    );
    const slugs = new Set(existingCities.map((city) => city.slug));
    const seen = new Set<string>();
    let created = 0;
    let updatedCoordinates = 0;
    let duplicates = 0;

    for (const row of rows) {
      if (row.iso2 !== 'IN' || row.country !== 'India') continue;
      const stateId = stateByName.get(normalizedName(row.admin_name));
      if (!stateId) throw new Error(`No state master match for “${row.admin_name}”.`);

      const rawName = plainName(row.city);
      const name = CITY_NAME_ALIASES[normalizedName(rawName)] ?? rawName;
      const latitude = Number(row.lat);
      const longitude = Number(row.lng);
      if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error(`Invalid city record for “${row.city}”.`);
      }

      const key = `${stateId}:${normalizedName(name)}`;
      if (seen.has(key)) {
        duplicates += 1;
        continue;
      }
      seen.add(key);

      const existing = cityLookup.get(key);
      if (existing) {
        if (existing.latitude === null || existing.longitude === null) {
          await prisma.city.update({
            where: { id: existing.id },
            data: { latitude, longitude },
          });
          updatedCoordinates += 1;
        }
        continue;
      }

      const baseSlug = slugify(name) || 'city';
      let slug = baseSlug;
      if (slugs.has(slug)) slug = `${baseSlug}-${slugify(row.admin_name)}`;
      let suffix = 2;
      while (slugs.has(slug)) slug = `${baseSlug}-${suffix++}`;

      const city = await prisma.city.create({
        data: { countryId: country.id, stateId, name, slug, latitude, longitude },
      });
      cityLookup.set(key, city);
      slugs.add(slug);
      created += 1;
    }

    console.log(
      `India geography ready: ${STATE_MASTER.length} states/UTs; ${created} cities added; ${updatedCoordinates} existing cities received coordinates; ${duplicates} duplicate rows skipped.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
