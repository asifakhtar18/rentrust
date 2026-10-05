/**
 * Deterministic slug generation. Lowercases, strips accents, replaces
 * non-alphanumerics with hyphens, and collapses repeats. A short random suffix
 * can be appended by callers to guarantee uniqueness.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** Normalises a name for duplicate detection: lowercase, single-spaced. */
export function normalizeName(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
