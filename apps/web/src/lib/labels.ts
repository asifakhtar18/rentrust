/* ------------------------------------------------------------------ */
/*  Human-readable label maps for enums and tags.                      */
/* ------------------------------------------------------------------ */

/** Review category labels keyed by ReviewCategoryKey. */
export const CATEGORY_LABELS: Record<string, string> = {
  management: 'Management',
  maintenance: 'Maintenance',
  deposit: 'Deposit Handling',
  communication: 'Communication',
  safety: 'Safety',
  condition: 'Property Condition',
  rules: 'Rules & Restrictions',
  experience: 'Overall Experience',
};

/** Tenure bucket labels. */
export const TENURE_LABELS: Record<string, string> = {
  LT_3_MONTHS: 'Less than 3 months',
  M3_6: '3–6 months',
  M6_12: '6–12 months',
  Y1_2: '1–2 years',
  GT_2_YEARS: '2+ years',
};

/** Property type labels. */
export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Apartment',
  PG: 'PG',
  CO_LIVING: 'Co-Living',
  HOSTEL: 'Hostel',
  INDEPENDENT_HOUSE: 'Independent House',
  VILLA: 'Villa',
  BUILDER_PROPERTY: 'Builder Property',
};

/**
 * Converts a snake_case or UPPER_SNAKE tag into a readable string.
 *
 * ```ts
 * humanizeTag('well_maintained')  // 'Well maintained'
 * humanizeTag('GT_2_YEARS')       // 'Gt 2 years'
 * ```
 */
export function humanizeTag(tag: string): string {
  const lower = tag.toLowerCase().replace(/_/g, ' ');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
