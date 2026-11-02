'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, FileCheck2, Search, ShieldCheck, Upload } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, qs } from '@/lib/api';
import { preparePrivateDocument } from '@/lib/private-document';
import type {
  MyReview,
  PropertyDetail,
  SearchHit,
  VerificationDocumentRef,
  VerificationEvidenceType,
} from '@/lib/types';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, Field, Input, Section } from '@/components/ui/primitives';

const EVIDENCE_TYPES: Array<{ value: VerificationEvidenceType; label: string }> = [
  { value: 'RENTAL_AGREEMENT', label: 'Rental or lease agreement' },
  { value: 'RENT_RECEIPT', label: 'Rent receipt' },
  { value: 'UTILITY_DOCUMENT', label: 'Utility document' },
  { value: 'MANAGEMENT_VERIFICATION', label: 'Confirmation from property management' },
  { value: 'RESIDENT_INVITATION', label: 'Invitation from a verified resident' },
  { value: 'OTHER', label: 'Other supporting document' },
];

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export function VerificationForm() {
  const { user, loading: authLoading, request } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const initialPropertyId = params.get('propertyId');
  const initialReviewId = params.get('reviewId');
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [property, setProperty] = useState<{ id: string; title: string; subtitle?: string } | null>(
    null,
  );
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [reviewId, setReviewId] = useState(initialReviewId ?? '');
  const [evidenceType, setEvidenceType] = useState<VerificationEvidenceType>('RENTAL_AGREEMENT');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login?next=/verifications/new');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      request<MyReview[]>('/me/reviews'),
      initialPropertyId
        ? apiFetch<PropertyDetail>(`/properties/${encodeURIComponent(initialPropertyId)}`).then(
            ({ data }) => ({
              id: data.id,
              title: data.displayName,
              subtitle: data.locality?.name,
            }),
          )
        : Promise.resolve(null),
    ])
      .then(([mine, selected]) => {
        if (cancelled) return;
        setReviews(mine);
        setProperty(selected);
      })
      .catch((cause) => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : 'Could not load your account data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, request, initialPropertyId]);

  const propertyReviews = useMemo(
    () => reviews.filter((review) => review.propertyId === property?.id),
    [reviews, property?.id],
  );

  const searchProperties = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError('Enter at least two characters to search properties.');
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const result = await apiFetch<SearchHit[]>(
        `/search${qs({ q: trimmed, types: 'property', limit: 10 })}`,
      );
      setHits(result.data.filter((hit) => hit.type === 'property'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not search properties.');
    } finally {
      setSearching(false);
    }
  }, [query]);

  function chooseProperty(hit: SearchHit) {
    setProperty({ id: hit.id, title: hit.title, subtitle: hit.subtitle });
    setReviewId('');
    setHits([]);
    setQuery('');
  }

  async function uploadDocument(file: File): Promise<VerificationDocumentRef> {
    if (file.size < 1 || file.size > MAX_BYTES)
      throw new Error(`${file.name} must be smaller than 10 MiB.`);
    if (!ALLOWED_TYPES.includes(file.type))
      throw new Error(`${file.name} must be a PDF, JPEG, PNG, or WebP file.`);
    const prepared = await preparePrivateDocument(file);

    const upload = await request<{
      key: string;
      uploadUrl: string;
      requiredHeaders: Record<string, string>;
    }>('/verifications/upload-url', {
      method: 'POST',
      body: JSON.stringify({ contentType: prepared.contentType, sizeBytes: prepared.sizeBytes }),
    });
    if (new URL(upload.uploadUrl).hostname !== 'mock-storage.local') {
      const response = await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: upload.requiredHeaders,
        body: prepared.body,
      });
      if (!response.ok) throw new Error(`Could not upload ${file.name}. Please try again.`);
    }
    return {
      storageKey: upload.key,
      contentType: prepared.contentType,
      sizeBytes: prepared.sizeBytes,
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!property) {
      setError('Choose the property where you lived.');
      return;
    }
    if (files.length < 1 || files.length > 10) {
      setError('Choose between 1 and 10 supporting documents.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const documents = await Promise.all(files.map(uploadDocument));
      const result = await request<{ id: string; status: string }>('/verifications', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: property.id,
          ...(reviewId ? { reviewId } : {}),
          evidenceType,
          documents,
        }),
      });
      setCreatedId(result.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit your verification.');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user || loading) {
    return (
      <Section className="py-16">
        <p className="t-meta">Loading verification form…</p>
      </Section>
    );
  }

  if (createdId) {
    return (
      <Section className="max-w-2xl py-12">
        <Card elevated className="p-7 text-center">
          <ShieldCheck className="mx-auto size-9 text-success" aria-hidden />
          <h1 className="mt-4 t-section-title text-foreground">Evidence submitted</h1>
          <p className="mt-2 t-body text-muted-foreground">
            Our review team will check your documents. Your evidence stays private.
          </p>
          <LinkButton href="/profile" variant="primary" className="mt-6">
            Back to your account
          </LinkButton>
        </Card>
      </Section>
    );
  }

  return (
    <Section className="max-w-2xl py-10">
      <Link
        href="/profile"
        className="inline-flex items-center gap-2 t-meta text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Your account
      </Link>
      <h1 className="mt-5 t-page-title text-foreground">Verify your residency</h1>
      <p className="mt-2 max-w-xl t-body text-muted-foreground">
        Upload evidence for a property you lived in. Only RenTrust reviewers can access these
        documents; they are never shown on your public profile.
      </p>

      <Card elevated className="mt-7 p-6">
        <form onSubmit={submit} className="space-y-6">
          {property ? (
            <div className="rounded-md border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="t-label text-foreground">{property.title}</p>
                  {property.subtitle && <p className="mt-1 t-helper">{property.subtitle}</p>}
                </div>
                {!initialPropertyId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setProperty(null);
                      setReviewId('');
                    }}
                  >
                    Change
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Field
              label="Property"
              htmlFor="property-search"
              hint="Search for the property where you lived."
            >
              <div className="flex gap-2">
                <Input
                  id="property-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void searchProperties();
                    }
                  }}
                  placeholder="Search properties…"
                />
                <Button
                  type="button"
                  variant="secondary"
                  loading={searching}
                  onClick={() => void searchProperties()}
                  aria-label="Search properties"
                >
                  <Search className="size-4" aria-hidden /> Search
                </Button>
              </div>
              {hits.length > 0 && (
                <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-card">
                  {hits.map((hit) => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        onClick={() => chooseProperty(hit)}
                        className="w-full px-3 py-2.5 text-left hover:bg-muted"
                      >
                        <span className="block t-label text-foreground">{hit.title}</span>
                        {hit.subtitle && (
                          <span className="mt-0.5 block t-helper">{hit.subtitle}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Field>
          )}

          {propertyReviews.length > 0 && (
            <Field
              label="Link a review (optional)"
              htmlFor="verification-review"
              hint="A linked review can receive the verified-resident badge after approval."
            >
              <select
                id="verification-review"
                value={reviewId}
                onChange={(event) => setReviewId(event.target.value)}
                className="h-11 w-full rounded-md border border-input bg-card px-3.5 t-body text-foreground"
              >
                <option value="">No review linked</option>
                {propertyReviews.map((review) => (
                  <option key={review.id} value={review.id} disabled={review.isVerified}>
                    {review.isVerified
                      ? 'Already verified'
                      : `${review.status.replaceAll('_', ' ')} · ${review.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Evidence type" htmlFor="evidence-type">
            <select
              id="evidence-type"
              value={evidenceType}
              onChange={(event) => setEvidenceType(event.target.value as VerificationEvidenceType)}
              className="h-11 w-full rounded-md border border-input bg-card px-3.5 t-body text-foreground"
            >
              {EVIDENCE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Supporting documents"
            htmlFor="evidence-files"
            hint="PDF, JPEG, PNG, or WebP · up to 10 MiB each · 10 files maximum. Cover sensitive account numbers before uploading."
          >
            <Input
              id="evidence-files"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              className="h-auto py-2.5"
            />
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="flex items-center gap-2 t-helper"
                  >
                    <FileCheck2 className="size-3.5 text-success" aria-hidden />
                    {file.name} · {Math.ceil(file.size / 1024)} KB
                  </li>
                ))}
              </ul>
            )}
          </Field>

          {error && (
            <p role="alert" className="t-meta text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <Button type="submit" loading={submitting}>
              <Upload className="size-4" aria-hidden /> Submit for review
            </Button>
            <p className="t-helper">Your evidence is only available to RenTrust reviewers.</p>
          </div>
        </form>
      </Card>
    </Section>
  );
}
