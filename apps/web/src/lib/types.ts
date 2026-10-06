export type PropertyType =
  | 'APARTMENT'
  | 'PG'
  | 'CO_LIVING'
  | 'HOSTEL'
  | 'INDEPENDENT_HOUSE'
  | 'VILLA'
  | 'BUILDER_PROPERTY';

export type UserRole = 'USER' | 'OWNER' | 'MANAGER' | 'MODERATOR' | 'ADMIN';

export interface ApiMeta {
  requestId?: string;
  nextCursor?: string | null;
  hasMore?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  count?: number;
  unread?: number;
  [k: string]: unknown;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  roles: UserRole[];
  emailVerified: boolean;
}

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
  distanceMeters?: number;
}

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

export interface PropertyDetail extends Property {
  address: { line1: string | null; postalCode: string | null } | null;
  locality: { id: string; name: string; slug: string } | null;
  landlords: Array<{ id: string; displayName: string; role: string }>;
  managers: Array<{ id: string; displayName: string; role: string }>;
  reviewCount: number;
}

export interface PublicReview {
  id: string;
  propertyId: string;
  isVerified: boolean;
  tenure: string;
  overall: number | null;
  authorAlias: string;
  categoryScores: Record<string, number> | null;
  wouldRecommend: boolean | null;
  wouldRentAgain: string | null;
  likedTags: string[];
  dislikedTags: string[];
  likedText: string | null;
  dislikedText: string | null;
  comments: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface SearchHit {
  type: 'property' | 'landlord' | 'locality';
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  relevance: number;
  distanceMeters?: number;
  meta?: Record<string, unknown>;
}

export interface Locality {
  id: string;
  name: string;
  slug: string;
  cityId: string;
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

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}
