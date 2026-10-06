/** Human-readable labels for backend enum keys used across the UI. */

export const CATEGORY_LABELS: Record<string, string> = {
  management: 'Management',
  maintenance: 'Maintenance',
  deposit: 'Deposit experience',
  communication: 'Communication',
  safety: 'Safety',
  condition: 'Property condition',
  rules: 'Rules transparency',
  experience: 'Living experience',
};

export const TENURE_LABELS: Record<string, string> = {
  LT_3_MONTHS: 'Less than 3 months',
  M3_6: '3–6 months',
  M6_12: '6–12 months',
  Y1_2: '1–2 years',
  GT_2_YEARS: '2+ years',
};

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Apartment',
  PG: 'PG',
  CO_LIVING: 'Co-living',
  HOSTEL: 'Hostel',
  INDEPENDENT_HOUSE: 'Independent house',
  VILLA: 'Villa',
  BUILDER_PROPERTY: 'Builder property',
};

/** Turns a snake_case tag into a readable phrase. */
export function humanizeTag(tag: string): string {
  return tag.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
