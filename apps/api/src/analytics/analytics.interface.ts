/**
 * Product analytics abstraction. Callers emit named events through this
 * interface; the concrete provider (DB today, Segment/PostHog/etc. later) is
 * hidden behind the token so swapping providers never touches domain code.
 * Privacy: no PII in event props; userId is optional and events may be fully
 * anonymous (anonId only).
 */

export const PRODUCT_EVENT = {
  SEARCH_PERFORMED: 'SEARCH_PERFORMED',
  PROPERTY_VIEWED: 'PROPERTY_VIEWED',
  REVIEW_VIEWED: 'REVIEW_VIEWED',
  REVIEW_STARTED: 'REVIEW_STARTED',
  REVIEW_SUBMITTED: 'REVIEW_SUBMITTED',
  REVIEW_VERIFIED: 'REVIEW_VERIFIED',
  PROPERTY_SAVED: 'PROPERTY_SAVED',
  PROPERTY_COMPARED: 'PROPERTY_COMPARED',
  CLAIM_STARTED: 'CLAIM_STARTED',
  CLAIM_COMPLETED: 'CLAIM_COMPLETED',
} as const;

export type ProductEventName = (typeof PRODUCT_EVENT)[keyof typeof PRODUCT_EVENT];

export interface AnalyticsEventInput {
  name: ProductEventName | string;
  userId?: string | null;
  anonId?: string | null;
  props?: Record<string, unknown>;
}

export interface AnalyticsProvider {
  track(event: AnalyticsEventInput): Promise<void>;
}

export const ANALYTICS_PROVIDER = Symbol('ANALYTICS_PROVIDER');
