'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Badge, Button, Card, Input, Spinner } from '@/components/ui';

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export default function AdminUsers() {
  const { request } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    async (q: string) => {
      try {
        const { data, meta } = await request<AdminUser[]>(
          `/admin/users?pageSize=25${q ? `&search=${encodeURIComponent(q)}` : ''}`,
        );
        setUsers(data);
        setTotal((meta.total as number) ?? data.length);
      } catch {
        setUsers([]);
      }
    },
    [request],
  );

  useEffect(() => {
    void load('');
  }, [load]);

  async function toggleStatus(u: AdminUser) {
    setBusy(u.id);
    const status = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await request(`/admin/users/${u.id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      setUsers((prev) => prev?.map((x) => (x.id === u.id ? { ...x, status } : x)) ?? null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="text-title2 font-semibold tracking-tight text-ink">Users</h1>
      <p className="mt-1 text-footnote text-ink-secondary">{total} total accounts.</p>

      <form
        className="mt-4 max-w-sm"
        onSubmit={(e) => {
          e.preventDefault();
          void load(search);
        }}
      >
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email" />
      </form>

      {users === null ? (
        <div className="mt-8 flex items-center gap-2 text-footnote text-ink-tertiary">
          <Spinner className="text-accent" /> Loading…
        </div>
      ) : (
        <Card className="mt-5 overflow-hidden">
          <div className="divide-y divide-hairline/10">
            {users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-footnote font-medium text-ink">
                    {u.displayName ?? u.email}
                  </p>
                  <p className="truncate text-caption text-ink-tertiary">{u.email}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {u.roles.map((r) => (
                    <Badge key={r} tone={r === 'ADMIN' ? 'accent' : 'neutral'}>
                      {r.toLowerCase()}
                    </Badge>
                  ))}
                  <Badge tone={u.status === 'ACTIVE' ? 'positive' : 'critical'}>
                    {u.status.toLowerCase()}
                  </Badge>
                </div>
                <Button size="sm" variant="secondary" loading={busy === u.id} onClick={() => toggleStatus(u)}>
                  {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
