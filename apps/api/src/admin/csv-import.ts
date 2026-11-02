import type { PropertyType } from '@prisma/client';

/**
 * Minimal, dependency-free CSV parser + validator for admin property imports.
 *
 * Expected header (case-insensitive, order-independent):
 *   display_name, property_type, developer, year_built, latitude, longitude, aliases
 * `aliases` is a pipe-separated list. Only display_name and property_type are
 * required. Validation is strict and row-scoped so a single bad row is reported
 * precisely without aborting the whole file.
 */

export interface ParsedPropertyRow {
  rowNumber: number;
  displayName: string;
  propertyType: PropertyType;
  developer?: string;
  yearBuilt?: number;
  latitude?: number;
  longitude?: number;
  aliases: string[];
}

export interface RowError {
  row: number; // 1-based data row (excluding header)
  errors: string[];
}

export interface CsvParseResult {
  valid: ParsedPropertyRow[];
  errors: RowError[];
}

const REQUIRED_HEADERS = ['display_name', 'property_type'];
const PROPERTY_TYPE_VALUES = [
  'APARTMENT',
  'PG',
  'CO_LIVING',
  'HOSTEL',
  'INDEPENDENT_HOUSE',
  'VILLA',
  'BUILDER_PROPERTY',
] as const;
const PROPERTY_TYPE_SET = new Set<string>(PROPERTY_TYPE_VALUES);

/** Splits a single CSV line honouring double-quoted fields with commas. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parsePropertyCsv(csv: string): CsvParseResult {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { valid: [], errors: [{ row: 0, errors: ['CSV is empty'] }] };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return {
      valid: [],
      errors: [{ row: 0, errors: [`Missing required headers: ${missing.join(', ')}`] }],
    };
  }

  const idx = (name: string) => headers.indexOf(name);
  const valid: ParsedPropertyRow[] = [];
  const errors: RowError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const rowErrors: string[] = [];

    const displayName = cells[idx('display_name')] ?? '';
    if (displayName.length < 2) {
      rowErrors.push('display_name is required (min 2 chars)');
    }

    const typeRaw = (cells[idx('property_type')] ?? '').toUpperCase();
    if (!PROPERTY_TYPE_SET.has(typeRaw)) {
      rowErrors.push(`property_type must be one of: ${[...PROPERTY_TYPE_VALUES].join(', ')}`);
    }

    const yearBuilt = parseOptionalInt(
      cells[idx('year_built')],
      'year_built',
      rowErrors,
      1800,
      2100,
    );
    const latitude = parseOptionalFloat(cells[idx('latitude')], 'latitude', rowErrors, -90, 90);
    const longitude = parseOptionalFloat(
      cells[idx('longitude')],
      'longitude',
      rowErrors,
      -180,
      180,
    );

    if (rowErrors.length > 0) {
      errors.push({ row: i, errors: rowErrors });
      continue;
    }

    valid.push({
      rowNumber: i,
      displayName,
      propertyType: typeRaw as PropertyType,
      developer: optional(cells[idx('developer')]),
      yearBuilt,
      latitude,
      longitude,
      aliases: parseAliases(cells[idx('aliases')]),
    });
  }

  return { valid, errors };
}

function optional(value?: string): string | undefined {
  const v = value?.trim();
  return v && v.length > 0 ? v : undefined;
}

function parseAliases(value?: string): string[] {
  if (!value) return [];
  return value
    .split('|')
    .map((a) => a.trim())
    .filter(Boolean);
}

function parseOptionalInt(
  value: string | undefined,
  field: string,
  errors: string[],
  min: number,
  max: number,
): number | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) {
    errors.push(`${field} must be an integer in [${min}, ${max}]`);
    return undefined;
  }
  return n;
}

function parseOptionalFloat(
  value: string | undefined,
  field: string,
  errors: string[],
  min: number,
  max: number,
): number | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  const n = Number(v);
  if (Number.isNaN(n) || n < min || n > max) {
    errors.push(`${field} must be a number in [${min}, ${max}]`);
    return undefined;
  }
  return n;
}
