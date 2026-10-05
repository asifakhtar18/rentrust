/**
 * Queue names and job types. Centralised so producers and workers agree on the
 * contract. Each queue maps to a BullMQ queue backed by Redis.
 */
export const QUEUE_NAMES = {
  TRUST_SCORE: 'trust-score',
  NOTIFICATIONS: 'notifications',
} as const;

export const JOB = {
  RECALCULATE_PROPERTY_SCORE: 'recalculate-property-score',
  SEND_NOTIFICATION: 'send-notification',
} as const;

export interface RecalculateScoreJob {
  propertyId: string;
}

/**
 * Shared BullMQ job options: bounded retries with exponential backoff, and
 * cleanup of completed/failed jobs so Redis does not grow unbounded. Jobs are
 * designed to be idempotent (recomputing a score is naturally idempotent).
 */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};
