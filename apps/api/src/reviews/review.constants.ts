/**
 * Canonical review-category keys. These are the dimensions the trust score and
 * the public breakdown are organised around. Kept as a const tuple so both the
 * scoring engine (Phase 7) and the review mapping share one source of truth.
 */
export const REVIEW_CATEGORY_KEYS = [
  'management',
  'maintenance',
  'deposit',
  'communication',
  'safety',
  'condition',
  'rules',
  'experience',
] as const;

export type ReviewCategoryKey = (typeof REVIEW_CATEGORY_KEYS)[number];

/**
 * Curated multiple-choice tags for the "what did you like / dislike" questions.
 * Free text is allowed in addition, but tags give structured, moderatable,
 * aggregatable themes for locality/property intelligence.
 */
export const LIKED_TAGS = [
  'spacious',
  'well_maintained',
  'responsive_management',
  'safe_neighbourhood',
  'good_water_supply',
  'reliable_power',
  'quiet',
  'good_amenities',
  'great_location',
  'fair_deposit_handling',
  'friendly_neighbours',
  'value_for_money',
] as const;

export const DISLIKED_TAGS = [
  'poor_maintenance',
  'unresponsive_management',
  'water_issues',
  'power_cuts',
  'noisy',
  'safety_concerns',
  'deposit_disputes',
  'hidden_charges',
  'strict_rules',
  'parking_issues',
  'pest_issues',
  'poor_internet',
] as const;

export type LikedTag = (typeof LIKED_TAGS)[number];
export type DislikedTag = (typeof DISLIKED_TAGS)[number];
