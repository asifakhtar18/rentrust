/**
 * Opaque cursor encoding helpers. A cursor is just a base64url-encoded JSON
 * payload describing the position of the last item. Keeping it opaque means we
 * can change the internal shape (e.g. switch sort key) without breaking clients.
 */

export function encodeCursor(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor<T extends Record<string, unknown>>(cursor?: string): T | null {
  if (!cursor) {
    return null;
  }
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Given rows fetched with `limit + 1`, build the paginated result and compute
 * the next cursor from the last returned row.
 */
export function buildCursorPage<T>(
  rows: T[],
  limit: number,
  makeCursor: (row: T) => Record<string, unknown>,
): PaginatedResult<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor(makeCursor(last)) : null,
  };
}
