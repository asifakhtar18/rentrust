'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { AdminUser, UserRole } from '@/lib/types';
import { Badge, Input } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { AdminHeader, Panel, TableLoading, TableError, TableEmpty, Th, Td } from '../admin-ui';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 20;
const AVAILABLE_ROLES = ['USER', 'OWNER', 'MANAGER', 'MODERATOR', 'ADMIN'] as const;

export default function UsersPage() {
  const { request } = useAuth();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(
    async (p: number, q: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
        if (q.trim()) params.set('search', q.trim());
        setItems(await request<AdminUser[]>(`/admin/users?${params.toString()}`));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load users.');
      } finally {
        setLoading(false);
      }
    },
    [request],
  );

  useEffect(() => {
    void load(page, query);
  }, [load, page, query]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQuery(search);
  }

  async function changeRoles(user: AdminUser, roles: UserRole[]) {
    setSavingUser(user.id);
    setActionError(null);
    try {
      const updated = await request<{ id: string; roles: UserRole[] }>(`/admin/users/${user.id}/roles`, {
        method: 'PUT', body: JSON.stringify({ roles }),
      });
      setItems((current) => current.map((item) => item.id === user.id ? { ...item, roles: updated.roles } : item));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update roles.');
    } finally {
      setSavingUser(null);
    }
  }

  return (
    <div>
      <AdminHeader
        title="Users"
        description="Registered accounts. Search by email."
        actions={
          <form onSubmit={submitSearch} className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email…"
              className="h-9 pl-9 text-[13px]"
              aria-label="Search users by email"
            />
          </form>
        }
      />

      <Panel>
        {actionError && <p role="alert" className="border-b border-destructive/30 bg-destructive/5 px-4 py-3 t-meta text-destructive">{actionError}</p>}
        {loading ? (
          <TableLoading />
        ) : error ? (
          <TableError message={error} onRetry={() => void load(page, query)} />
        ) : items.length === 0 ? (
          <TableEmpty title="No users found" body={query ? `No accounts match “${query}”.` : undefined} />
        ) : (
          <table className="w-full border-collapse">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <Th>Email</Th>
                <Th>Name</Th>
                <Th>Roles</Th>
                <Th>Status</Th>
                <Th>Email verified</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <Td className="font-medium text-foreground">{u.email}</Td>
                  <Td className="text-muted-foreground">{u.displayName ?? '—'}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <div className="flex flex-wrap gap-1">{u.roles.map((r) => (
                        <Badge key={r} tone={r === 'ADMIN' ? 'danger' : r === 'MODERATOR' ? 'warning' : 'neutral'}>{r}</Badge>
                      ))}</div>
                      <select aria-label={`Roles for ${u.email}`} multiple value={u.roles} disabled={savingUser === u.id}
                        onChange={(e) => void changeRoles(u, Array.from(e.currentTarget.selectedOptions, (option) => option.value as UserRole))}
                        className="mt-2 min-w-32 rounded border border-border bg-background p-1 text-xs">
                        {AVAILABLE_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </div>
                  </Td>
                  <Td>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 t-label',
                        u.status === 'ACTIVE' ? 'text-success' : 'text-destructive',
                      )}
                    >
                      <span className={cn('size-1.5 rounded-full', u.status === 'ACTIVE' ? 'bg-success' : 'bg-destructive')} aria-hidden />
                      {u.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                    </span>
                  </Td>
                  <Td className="text-muted-foreground">{u.emailVerifiedAt ? 'Yes' : 'No'}</Td>
                  <Td className="text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {!loading && !error && (items.length === PAGE_SIZE || page > 1) && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <span className="t-meta">Page {page}</span>
          <Button variant="secondary" size="sm" disabled={items.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
