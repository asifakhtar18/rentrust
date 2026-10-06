/* ------------------------------------------------------------------ */
/*  Shared TypeScript types for the RenTrust web client.               */
/*  These mirror the backend API response shapes exactly.              */
/* ------------------------------------------------------------------ */

// ---- Enums (mirrors Prisma enums) ----

export type PropertyType =
  | 'APARTMENT'
  | 'PG'
  | 'CO_LIVING'
  | 'HOSTEL'
  | 'INDEPENDENT_HOUSE'
  | 'VILLA'
  | 'BUILDER_PROPERTY';

export type UserRole = 'USER' | 'OWNER' | 'MANAGER' | 'MODERATOR' | 'ADMIN';

export type TenureBucket =
  | 'LT_3_MONTHS'
  | 'M3_6'
  | 'M6_12'
  | 'Y1_2'
  | 'GT_2_YEARS';

export type TriState = 'YES' | 'NO' | 'MAYBE';

export type NotificationChannel = 'IN_APP' | 'EMAIL';
export type NotificationStatus = 'PENDING' | 'SENT' | 'READ' | 'FAILED';
export type SearchEntityType = 'property' | 'landlord' | 'locality';

// ---- API envelope ----

export interface ApiMeta {
  requestId?: string;
  [key: string]: unknown;
}

// ---- Auth ----

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  roles: UserRole[];
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ---- Property ----

export interface Property {
  id: string;
  canonicalName: string;
  displayName: string;
  slug: string;
  aliases: string[];
  propertyType: PropertyType;
  status: string;
  localityId: string | null;
  latitude: number | null;
  longitude: number | null;
  developer: string | null;
  yearBuilt: number | null;
  amenities: string[];
  description: string | null;
  isClaimed: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- Trust score ----

export interface CategoryScore {
  score: number;
  sampleSize: number;
}

export interface TrustScore {
  propertyId: string;
  hasEnoughData: boolean;
  message?: string;
  overall: number | null;
  sampleSize: number;
  confidence: number;
  lowConfidence?: boolean;
  categoryScores: Record<string, CategoryScore>;
  positiveThemes: string[];
  negativeThemes: string[];
  lastCalculatedAt: string | null;
}

// ---- Property detail ----

export interface PropertyDetail extends Property {
  address: {
    line1: string | null;
    line2: string | null;
    cityId: string;
    localityId: string | null;
    postalCode: string | null;
  } | null;
  locality: Locality | null;
  score: TrustScore | null;
  landlords: Array<{ id: string; name: string; role: string }>;
  managers: Array<{ id: string; name: string; role: string }>;
  reviewCount: number;
}

// ---- Reviews ----

export interface PublicReview {
  id: string;
  propertyId: string;
  isVerified: boolean;
  tenure: TenureBucket;
  overall: number | null;
  authorAlias: string;
  categoryScores: Record<string, number> | null;
  wouldRecommend: boolean | null;
  wouldRentAgain: TriState | null;
  likedTags: string[];
  dislikedTags: string[];
  likedText: string | null;
  dislikedText: string | null;
  comments: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export type ReviewStatus =
  | 'DRAFT'
  | 'PENDING_MODERATION'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'HIDDEN'
  | 'UNDER_REVIEW'
  | 'REMOVED';

/** A saved property row from /me/saved: public property + its score + savedAt. */
export interface SavedProperty extends Property {
  score: TrustScore;
  savedAt: string;
}

/** The authenticated user's own review (any status) from /me/reviews. */
export interface MyReview {
  id: string;
  propertyId: string;
  status: ReviewStatus;
  isVerified: boolean;
  tenure: TenureBucket;
  overall: number | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---- Search ----

export interface SearchHit {
  type: SearchEntityType;
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  relevance: number;
  distanceMeters?: number;
  meta?: Record<string, unknown>;
}

// ---- Locations ----

export interface Locality {
  id: string;
  cityId: string;
  name: string;
  slug: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface LocalityIntelligence {
  locality: { id: string; name: string; slug: string };
  propertyCount: number;
  scoredPropertyCount?: number;
  totalReviews?: number;
  hasEnoughData: boolean;
  message?: string;
  averageTrustScore?: number;
  categoryAverages?: Record<string, number>;
  commonPositiveThemes?: string[];
  commonComplaints?: string[];
}

// ---- Admin ----

export interface AdminDashboard {
  users: number;
  verifiedResidents: number;
  reviews: number;
  verifiedReviews: number;
  properties: number;
  claimedProperties: number;
  pendingModeration: number;
  pendingVerification: number;
  openReports: number;
  activeCities: number;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  roles: UserRole[];
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export type ModerationDecision = 'PUBLISH' | 'REJECT' | 'HIDE' | 'UNHIDE' | 'REMOVE' | 'RESTORE';

export interface ModerationQueueItem {
  id: string;
  propertyId: string;
  status: ReviewStatus;
  createdAt: string;
  openReports: number;
  reportReasons: string[];
  contentFlags: string[];
}

export interface DocumentMeta {
  id: string;
  contentType: string;
  sizeBytes: number;
}

export interface VerificationQueueItem {
  id: string;
  userId: string;
  propertyId: string;
  reviewId: string | null;
  status: string;
  evidenceType: string;
  createdAt: string;
  documents: DocumentMeta[];
}

export interface ClaimQueueItem {
  id: string;
  propertyId: string;
  claimantId: string;
  role: string;
  status: string;
  createdAt: string;
  documents: DocumentMeta[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---- Notifications ----

export interface Notification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  status: NotificationStatus;
  readAt: string | null;
  createdAt: string;
}
