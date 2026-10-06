/**
 * Lightweight heuristic content flagging for free-text review fields.
 *
 * Purpose: this is a triage aid for human moderators, NOT an automated
 * censor. It surfaces likely PII (phone/email/addresses/IDs) and potentially
 * harmful language (threats, slurs, unsupported criminal allegations) so a
 * moderator can look closely. It must never auto-remove content, and must never
 * be the sole basis for a decision — negative-but-legitimate reviews must pass
 * through. Precision is deliberately traded for recall here.
 */

export type FlagCategory =
  | 'PHONE_NUMBER'
  | 'EMAIL'
  | 'GOVERNMENT_ID'
  | 'STREET_ADDRESS'
  | 'THREAT'
  | 'HATE_SPEECH'
  | 'UNSUPPORTED_ALLEGATION';

export interface ContentFlag {
  category: FlagCategory;
  excerpt: string;
}

// Indian mobile numbers (optionally +91), tolerating internal spaces/hyphens
// (e.g. "+91 98765 43210", "9876543210", "98765-43210"). The leading [6-9]
// anchors to real Indian mobile prefixes to limit false positives.
const PHONE_RE = /(?:\+?91[-\s]?)?[6-9]\d{4}[-\s]?\d{5}\b/g;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
// Indian PAN (AAAAA9999A) and Aadhaar (12 digits, often spaced).
const PAN_RE = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
const AADHAAR_RE = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
// Flat/door number patterns like "Flat 4B", "Door No 12", "#301".
const ADDRESS_RE =
  /\b(?:flat|door|apt|apartment|unit|house)\s*(?:no\.?|number|#)?\s*[a-z]?\d+[a-z]?\b/gi;

const THREAT_TERMS = [
  'kill you',
  'hurt you',
  'beat you',
  'burn down',
  'come after you',
  'make you pay',
];

// A conservative, obviously-abusive slur list stands in for a managed service.
// Kept minimal and non-exhaustive on purpose; real deployments plug in a
// maintained classifier via this same seam.
const HATE_TERMS = ['subhuman', 'vermin'];

const ALLEGATION_TERMS = [
  'is a criminal',
  'is a thief',
  'is a fraud',
  'stole from',
  'ran a scam',
  'is a pedophile',
];

function collectMatches(text: string, re: RegExp, category: FlagCategory): ContentFlag[] {
  const flags: ContentFlag[] = [];
  const matches = text.match(re);
  if (matches) {
    for (const m of matches) {
      flags.push({ category, excerpt: m.trim().slice(0, 64) });
    }
  }
  return flags;
}

function collectTerms(text: string, terms: string[], category: FlagCategory): ContentFlag[] {
  const lower = text.toLowerCase();
  const flags: ContentFlag[] = [];
  for (const term of terms) {
    if (lower.includes(term)) {
      flags.push({ category, excerpt: term });
    }
  }
  return flags;
}

/**
 * Scans the review's free-text fields and returns any heuristic flags. An empty
 * array means "nothing suspicious found" — not "safe"; moderators still review.
 */
export function flagContent(parts: {
  likedText?: string | null;
  dislikedText?: string | null;
  comments?: string | null;
}): ContentFlag[] {
  const text = [parts.likedText, parts.dislikedText, parts.comments].filter(Boolean).join('\n');
  if (!text) return [];

  return [
    ...collectMatches(text, PHONE_RE, 'PHONE_NUMBER'),
    ...collectMatches(text, EMAIL_RE, 'EMAIL'),
    ...collectMatches(text, PAN_RE, 'GOVERNMENT_ID'),
    ...collectMatches(text, AADHAAR_RE, 'GOVERNMENT_ID'),
    ...collectMatches(text, ADDRESS_RE, 'STREET_ADDRESS'),
    ...collectTerms(text, THREAT_TERMS, 'THREAT'),
    ...collectTerms(text, HATE_TERMS, 'HATE_SPEECH'),
    ...collectTerms(text, ALLEGATION_TERMS, 'UNSUPPORTED_ALLEGATION'),
  ];
}
