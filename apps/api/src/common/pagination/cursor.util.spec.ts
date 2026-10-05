import { buildCursorPage, decodeCursor, encodeCursor } from './cursor.util';

describe('cursor utils', () => {
  it('round-trips a cursor payload', () => {
    const payload = { createdAt: '2026-01-01T00:00:00.000Z', id: 'abc' };
    const token = encodeCursor(payload);
    expect(decodeCursor(token)).toEqual(payload);
  });

  it('returns null for a missing or malformed cursor', () => {
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor('%%%not-base64%%%')).toBeNull();
  });

  it('builds a page with a next cursor when more rows exist', () => {
    const rows = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const page = buildCursorPage(rows, 2, (r) => ({ id: r.id }));
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).not.toBeNull();
    expect(decodeCursor(page.nextCursor!)).toEqual({ id: '2' });
  });

  it('builds a terminal page with no next cursor', () => {
    const rows = [{ id: '1' }, { id: '2' }];
    const page = buildCursorPage(rows, 5, (r) => ({ id: r.id }));
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });
});
