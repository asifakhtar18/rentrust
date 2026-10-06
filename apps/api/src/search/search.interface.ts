/**
 * Search abstraction. The MVP implements this over PostgreSQL (full-text +
 * trigram + PostGIS), but every caller depends on this interface so the engine
 * can be swapped for Elasticsearch/OpenSearch later (ADR notes) without
 * touching controllers or other domains.
 */

export type SearchEntityType = 'property' | 'landlord' | 'locality';

export interface SearchHit {
  type: SearchEntityType;
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  /** Relevance score (higher = better); engine-defined scale. */
  relevance: number;
  /** Distance in metres when a geo query is supplied. */
  distanceMeters?: number;
  /** Minimal, public-safe extra fields for rendering result cards. */
  meta?: Record<string, unknown>;
}

export interface SearchQuery {
  q: string;
  types?: SearchEntityType[];
  limit: number;
  /** Optional geo bias/filter. */
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
}

export interface SearchResult {
  query: string;
  hits: SearchHit[];
}

export interface SearchProvider {
  search(query: SearchQuery): Promise<SearchResult>;
}

export const SEARCH_PROVIDER = Symbol('SEARCH_PROVIDER');
