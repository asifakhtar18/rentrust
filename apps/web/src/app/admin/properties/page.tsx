'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, ChevronDown, Plus, Search, UploadCloud } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { Property, PropertyType } from '@/lib/types';
import { Badge, Input } from '@/components/ui/primitives';
import { Button, LinkButton } from '@/components/ui/button';
import { AdminHeader, Panel, TableEmpty, TableError, TableLoading, Td, Th } from '../admin-ui';

type AdminProperty = Property & { localityName: string | null; mergedIntoId: string | null };
interface PropertyPage {
  items: AdminProperty[];
  nextCursor: string | null;
  hasMore: boolean;
}

const PAGE_SIZE = 25;
const STATUSES = ['ALL', 'ACTIVE', 'HIDDEN', 'ARCHIVED', 'MERGED'] as const;
const TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: 'Apartment',
  PG: 'PG',
  CO_LIVING: 'Co-living',
  HOSTEL: 'Hostel',
  INDEPENDENT_HOUSE: 'Independent house',
  VILLA: 'Villa',
  BUILDER_PROPERTY: 'Builder property',
};

export default function AdminPropertiesPage() {
  const { request } = useAuth();
  const [items, setItems] = useState<AdminProperty[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);

  const load = useCallback(
    async (currentCursor: string | null, append = false) => {
      append ? setLoadingMore(true) : setLoading(true);
      setError(null);
      if (append) setMoreError(null);
      try {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
        if (query.trim()) params.set('search', query.trim());
        if (status !== 'ALL') params.set('status', status);
        if (currentCursor) params.set('cursor', currentCursor);
        const page = await request<PropertyPage>(`/properties/admin/list?${params.toString()}`);
        setItems((current) => (append ? [...current, ...page.items] : page.items));
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Could not load properties.';
        if (append) setMoreError(message);
        else setError(message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, request, status],
  );

  useEffect(() => {
    if (!query.trim()) {
      setItems([]);
      setNextCursor(null);
      setHasMore(false);
      setLoading(false);
      setError(null);
      return;
    }
    void load(null);
  }, [load, query]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(search);
      setCursor(null);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  function chooseStatus(value: (typeof STATUSES)[number]) {
    setStatus(value);
    setCursor(null);
  }

  function loadNext() {
    if (!nextCursor || loadingMore) return;
    setCursor(nextCursor);
    void load(nextCursor, true);
  }

  return (
    <div>
      <AdminHeader
        title="Properties"
        description="Search for a property to review or edit its record. The catalogue is only loaded after you search."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href="/admin/properties/import" variant="secondary" size="sm">
              <UploadCloud className="size-4" aria-hidden />
              Import CSV
            </LinkButton>
            <LinkButton href="/admin/properties/new" size="sm">
              <Plus className="size-4" aria-hidden />
              Add property
            </LinkButton>
          </div>
        }
      />

      <Panel>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search properties or aliases"
              className="pl-9"
              aria-label="Search properties or aliases"
            />
          </label>
          <label className="relative block w-full sm:w-48">
            <span className="sr-only">Filter by status</span>
            <select
              value={status}
              onChange={(event) => chooseStatus(event.target.value as (typeof STATUSES)[number])}
              className="h-11 w-full appearance-none rounded-md border border-input bg-card px-3.5 pr-9 t-body text-foreground"
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value === 'ALL' ? 'All statuses' : value[0] + value.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
          </label>
        </div>

        {error ? (
          <TableError message={error} onRetry={() => void load(cursor)} />
        ) : loading ? (
          <TableLoading />
        ) : !query.trim() ? (
          <TableEmpty
            title="Search the property catalogue"
            body="Enter a property name or known alias to find the record you need to review."
          />
        ) : items.length === 0 ? (
          <TableEmpty
            title={
              query || status !== 'ALL'
                ? 'No matching properties'
                : 'No properties in the catalogue yet'
            }
            body={
              query
                ? `Nothing matched “${query}”. Try another name or alias.`
                : 'Add the first property or import your existing catalogue.'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <Th>Property</Th>
                    <Th>Location</Th>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Added</Th>
                    <Th>
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((property) => (
                    <tr key={property.id} className="hover:bg-muted/30">
                      <Td>
                        <div className="font-medium text-foreground">{property.displayName}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {property.aliases.length
                            ? `Also known as ${property.aliases.slice(0, 2).join(', ')}`
                            : property.slug}
                        </div>
                      </Td>
                      <Td className="text-muted-foreground">
                        {property.localityName ?? 'Location not set'}
                      </Td>
                      <Td className="text-muted-foreground">
                        {TYPE_LABELS[property.propertyType] ?? property.propertyType}
                      </Td>
                      <Td>
                        <Badge
                          tone={
                            property.status === 'ACTIVE'
                              ? 'success'
                              : property.status === 'HIDDEN'
                                ? 'warning'
                                : 'neutral'
                          }
                        >
                          {property.status[0] + property.status.slice(1).toLowerCase()}
                        </Badge>
                      </Td>
                      <Td className="text-muted-foreground">
                        {new Date(property.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-3">
                          {property.status === 'MERGED' ? (
                            property.mergedIntoId ? (
                              <Link
                                href={`/admin/properties/${property.mergedIntoId}`}
                                className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap t-label text-primary hover:underline"
                              >
                                Edit survivor
                                <ArrowRight className="size-3.5" aria-hidden />
                              </Link>
                            ) : (
                              <span className="t-meta text-muted-foreground">Merged record</span>
                            )
                          ) : (
                            <Link
                              href={`/admin/properties/${property.id}`}
                              className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap t-label text-primary hover:underline"
                            >
                              Edit details
                              <ArrowRight className="size-3.5" aria-hidden />
                            </Link>
                          )}
                          <Link
                            href={`/properties/${property.id}`}
                            className="whitespace-nowrap t-meta text-muted-foreground hover:text-foreground"
                          >
                            View
                          </Link>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="t-meta">
                Showing {items.length} {items.length === 1 ? 'property' : 'properties'}
              </p>
              {moreError && (
                <p role="alert" className="t-meta text-destructive">
                  {moreError}{' '}
                  <button
                    className="ml-1 underline"
                    onClick={() => nextCursor && void load(nextCursor, true)}
                  >
                    Retry
                  </button>
                </p>
              )}
              {hasMore && (
                <Button variant="secondary" size="sm" loading={loadingMore} onClick={loadNext}>
                  Load more
                </Button>
              )}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
