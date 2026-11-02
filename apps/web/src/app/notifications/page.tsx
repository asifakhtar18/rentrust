'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, EmptyState, Section } from '@/components/ui/primitives';
import { useAuth } from '@/lib/auth-context';
import type { NotificationItem } from '@/lib/types';

export default function NotificationsPage() {
  const { user, loading: authLoading, request } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await request<NotificationItem[]>('/notifications'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login?next=/notifications');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function markRead(id: string) {
    if (updating) return;
    const previous = items;
    setUpdating(id);
    setError(null);
    setItems((current) => current.map((item) => item.id === id
      ? { ...item, readAt: new Date().toISOString(), status: 'READ' }
      : item));
    try {
      await request(`/notifications/${id}/read`, { method: 'POST' });
    } catch (cause) {
      setItems(previous);
      setError(cause instanceof Error ? cause.message : 'Could not update this notification.');
    } finally {
      setUpdating(null);
    }
  }

  async function markAllRead() {
    if (updating) return;
    const previous = items;
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => item.readAt ? item : { ...item, readAt: now, status: 'READ' }));
    setUpdating('all');
    setError(null);
    try {
      await request('/notifications/read-all', { method: 'POST' });
    } catch (cause) {
      setItems(previous);
      setError(cause instanceof Error ? cause.message : 'Could not mark notifications as read.');
    } finally {
      setUpdating(null);
    }
  }

  const unreadCount = items.filter((item) => !item.readAt).length;

  if (authLoading || (!user && loading)) {
    return <Section className="py-20"><p className="flex items-center gap-2 t-meta"><Loader2 className="size-4 animate-spin text-primary" aria-hidden />Loading…</p></Section>;
  }

  return (
    <Section className="py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="t-page-title text-foreground">Notifications</h1>
          <p className="mt-2 t-body text-muted-foreground">Updates about your reviews, verifications, and property claims.</p>
        </div>
        {unreadCount > 0 && <Button variant="secondary" size="sm" loading={updating === 'all'} onClick={() => void markAllRead()}>
          <Check className="size-4" aria-hidden />Mark all read
        </Button>}
      </header>

      <div className="mt-8">
        {loading ? (
          <p className="flex items-center gap-2 py-16 t-meta"><Loader2 className="size-4 animate-spin text-primary" aria-hidden />Loading your notifications…</p>
        ) : error ? (
          <div className="py-10"><p role="alert" className="t-body text-destructive">{error}</p><Button variant="secondary" size="sm" className="mt-4" onClick={() => void load()}>Try again</Button></div>
        ) : items.length === 0 ? (
          <EmptyState title="You’re all caught up" body="Updates about your reviews and account will show up here." />
        ) : (
          <Card as="section" elevated className="divide-y divide-border overflow-hidden" aria-label="Notifications">
            {items.map((item) => (
              <article key={item.id} className={`flex gap-4 px-4 py-5 sm:px-6 ${item.readAt ? '' : 'bg-primary/[0.035]'}`}>
                <span className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg ${item.readAt ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                  <Bell className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 className="t-label text-foreground">{item.title}</h2>
                    <time className="t-helper" dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                  </div>
                  <p className="mt-1 t-body text-muted-foreground">{item.body}</p>
                </div>
                {!item.readAt && <Button variant="ghost" size="sm" disabled={Boolean(updating)} loading={updating === item.id} onClick={() => void markRead(item.id)} aria-label={`Mark ${item.title} as read`}>
                  <Check className="size-4" aria-hidden /><span className="hidden sm:inline">Mark read</span>
                </Button>}
              </article>
            ))}
          </Card>
        )}
        {!loading && !error && items.length === 50 && <p className="mt-4 text-center t-helper">Showing the 50 most recent notifications.</p>}
      </div>
    </Section>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
