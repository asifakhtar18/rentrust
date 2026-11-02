/**
 * Domain event names and payloads. Events decouple "something happened" from
 * "do work in response", so review publishing never blocks on score
 * recalculation. The internal EventBus dispatches synchronously to in-process
 * listeners; heavy work is handed to BullMQ from those listeners.
 */

export const DomainEvent = {
  USER_REGISTERED: 'USER_REGISTERED',
  REVIEW_SUBMITTED: 'REVIEW_SUBMITTED',
  REVIEW_VERIFIED: 'REVIEW_VERIFIED',
  REVIEW_PUBLISHED: 'REVIEW_PUBLISHED',
  REVIEW_HIDDEN: 'REVIEW_HIDDEN',
  REVIEW_REPORTED: 'REVIEW_REPORTED',
  REVIEW_REMOVED: 'REVIEW_REMOVED',
  PROPERTY_CREATED: 'PROPERTY_CREATED',
  PROPERTY_CLAIMED: 'PROPERTY_CLAIMED',
  PROPERTY_CLAIM_APPROVED: 'PROPERTY_CLAIM_APPROVED',
  TRUST_SCORE_RECALCULATION_REQUESTED: 'TRUST_SCORE_RECALCULATION_REQUESTED',
  TRUST_SCORE_UPDATED: 'TRUST_SCORE_UPDATED',
} as const;

export type DomainEventName = (typeof DomainEvent)[keyof typeof DomainEvent];

export interface DomainEventPayloads {
  [DomainEvent.USER_REGISTERED]: { userId: string };
  [DomainEvent.REVIEW_SUBMITTED]: { reviewId: string; propertyId: string };
  [DomainEvent.REVIEW_VERIFIED]: { reviewId: string; propertyId: string };
  [DomainEvent.REVIEW_PUBLISHED]: { reviewId: string; propertyId: string };
  [DomainEvent.REVIEW_HIDDEN]: { reviewId: string; propertyId: string };
  [DomainEvent.REVIEW_REPORTED]: { reviewId: string; reportId: string };
  [DomainEvent.REVIEW_REMOVED]: { reviewId: string; propertyId: string };
  [DomainEvent.PROPERTY_CREATED]: { propertyId: string };
  [DomainEvent.PROPERTY_CLAIMED]: { propertyId: string; claimId: string };
  [DomainEvent.PROPERTY_CLAIM_APPROVED]: { propertyId: string; claimId: string };
  [DomainEvent.TRUST_SCORE_RECALCULATION_REQUESTED]: { propertyId: string };
  [DomainEvent.TRUST_SCORE_UPDATED]: { propertyId: string; overall: number };
}
