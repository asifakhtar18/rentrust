'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck, Mail, FileText, LogOut, Lock, KeyRound, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { MyReview, MyLocalityReview, ReviewStatus, MyClaim, ClaimStatus, MyVerification } from '@/lib/types';
import { TENURE_LABELS } from '@/lib/labels';
import { Section, Card, EmptyState, Badge } from '@/components/ui/primitives';
import { LinkButton, Button } from '@/components/ui/button';
import { scoreBand } from '@/components/trust-score/trust-score';
import { cn } from '@/lib/cn';

const STATUS_META: Record<ReviewStatus, { label: string; tone: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  PENDING_MODERATION: { label: 'In review', tone: 'warning' },
  UNDER_REVIEW: { label: 'In review', tone: 'warning' },
  PUBLISHED: { label: 'Published', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  HIDDEN: { label: 'Hidden', tone: 'neutral' },
  REMOVED: { label: 'Removed', tone: 'danger' },
};

const CLAIM_STATUS_META: Record<ClaimStatus, { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }> = {
  PENDING: { label: 'In review', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
};

export default function ProfilePage() {
  const { user, loading: authLoading, request, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [localityReviews, setLocalityReviews] = useState<MyLocalityReview[]>([]);
  const [claims, setClaims] = useState<MyClaim[]>([]);
  const [verifications, setVerifications] = useState<MyVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/profile');
    }
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reviewData, claimData, verificationData, localityReviewData] = await Promise.all([
        request<MyReview[]>('/me/reviews'),
        request<MyClaim[]>('/claims/mine').catch(() => [] as MyClaim[]),
        request<MyVerification[]>('/verifications/mine').catch(() => [] as MyVerification[]),
        request<MyLocalityReview[]>('/me/locality-reviews').catch(() => [] as MyLocalityReview[]),
      ]);
      setReviews(reviewData);
      setLocalityReviews(localityReviewData);
      setClaims(claimData);
      setVerifications(verificationData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your reviews.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  if (authLoading || !user) {
    return (
      <Section className="py-20">
        <div className="flex items-center gap-2 t-meta">
          <Loader2 className="size-4 animate-spin text-primary" /> Loading…
        </div>
      </Section>
    );
  }

  const initials = (user.displayName ?? user.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  return (
    <Section className="py-10">
      <h1 className="t-page-title text-foreground">Your account</h1>
      {searchParams.get('reviewSubmitted') === '1' && (
        <p role="status" className="mt-4 rounded-md border border-success/25 bg-success/10 px-4 py-3 t-meta text-success">
          Your review was received. It will appear publicly after moderation; you can track its status below.
        </p>
      )}
      {searchParams.get('areaReviewSubmitted') === '1' && (
        <p role="status" className="mt-4 rounded-md border border-success/25 bg-success/10 px-4 py-3 t-meta text-success">
          Your area review was received. It will appear publicly after moderation; track its status below.
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ---- Identity + privacy column ---- */}
        <div className="space-y-6">
          <Card elevated className="p-6">
            <div className="flex items-center gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                {initials || 'U'}
              </span>
              <div className="min-w-0">
                <p className="truncate t-title3 text-foreground">{user.displayName ?? 'Resident'}</p>
                <p className="truncate t-meta">{user.email}</p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              <div className="flex items-center gap-2">
                {user.emailVerified ? (
                  <Badge tone="success">
                    <ShieldCheck className="size-3.5" aria-hidden /> Email verified
                  </Badge>
                ) : (
                  <Badge tone="warning">
                    <Mail className="size-3.5" aria-hidden /> Email not verified
                  </Badge>
                )}
              </div>
              {!user.emailVerified && (
                <LinkButton href="/verify-email" variant="secondary" size="sm">
                  Verify email
                </LinkButton>
              )}
            </div>
          </Card>

          {/* Privacy reassurance — reflects how the platform actually works */}
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="t-label text-foreground">Your reviews are anonymous</p>
                <p className="mt-1 t-helper">
                  We never show your name on a review. Properties and other residents only see a non-identifying alias
                  and your tenure band.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="t-label text-foreground">Resident verification</p>
                <p className="mt-1 t-helper">
                  Share private residency evidence with our review team to support a verified-resident badge.
                </p>
              </div>
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            </div>
            <LinkButton href="/verifications/new" variant="secondary" size="sm" className="mt-4">
              Start verification
            </LinkButton>
            {verifications.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border pt-3">
                {verifications.slice(0, 3).map((verification) => (
                  <div key={verification.id} className="flex items-center justify-between gap-3">
                    <Link href={`/properties/${verification.propertyId}`} className="truncate t-helper text-primary hover:underline">
                      View property
                    </Link>
                    <Badge tone={verification.status === 'VERIFIED' ? 'success' : verification.status === 'PENDING' ? 'warning' : 'danger'}>
                      {verification.status === 'PENDING' ? 'In review' : verification.status.toLowerCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Button variant="secondary" size="md" className="w-full" onClick={() => void handleLogout()}>
            <LogOut className="size-4" aria-hidden /> Sign out
          </Button>
        </div>

        {/* ---- Reviews column ---- */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="t-section-title text-foreground">Your reviews</h2>
            {reviews.length > 0 && <span className="t-meta">{reviews.length} total</span>}
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="flex items-center gap-2 py-14 t-meta">
                <Loader2 className="size-4 animate-spin text-primary" /> Loading…
              </div>
            ) : error ? (
              <div className="py-8">
                <p className="t-body text-destructive">{error}</p>
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => void load()}>
                  Try again
                </Button>
              </div>
            ) : reviews.length === 0 ? (
              <EmptyState
                title="You haven't written a review yet"
                body="Shared your experience renting somewhere? It helps the next resident decide."
                action={<LinkButton href="/search" variant="primary">Review a property</LinkButton>}
              />
            ) : (
              <Card elevated className="divide-y divide-border overflow-hidden">
                {reviews.map((r) => (
                  <MyReviewRow key={r.id} review={r} hasVerificationRequest={verifications.some((item) => item.reviewId === r.id)} />
                ))}
              </Card>
            )}
          </div>

          {/* ---- My claims (only shown once there's at least one) ---- */}
          {!loading && claims.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h2 className="t-section-title text-foreground">Your property claims</h2>
                <span className="t-meta">{claims.length} total</span>
              </div>
              <Card elevated className="mt-4 divide-y divide-border overflow-hidden">
                {claims.map((c) => (
                  <MyClaimRow key={c.id} claim={c} />
                ))}
              </Card>
            </div>
          )}
          {!loading && localityReviews.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between"><h2 className="t-section-title text-foreground">Your area reviews</h2><span className="t-meta">{localityReviews.length} total</span></div>
              <Card elevated className="mt-4 divide-y divide-border overflow-hidden">
                {localityReviews.map((review) => <div key={review.id} className="flex items-center gap-4 px-4 py-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MapPin className="size-5" aria-hidden /></span>
                  <div className="min-w-0 flex-1"><Link href={`/localities/${review.localityId}`} className="t-label text-foreground hover:text-primary">{review.locality.name}</Link><p className="mt-0.5 t-meta">Neighbourhood experience · {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                  {review.overall != null && <span className="tabular t-label text-foreground">{review.overall.toFixed(1)} / 5</span>}
                  <Badge tone={STATUS_META[review.status].tone}>{STATUS_META[review.status].label}</Badge>
                </div>)}
              </Card>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

function MyClaimRow({ claim }: { claim: MyClaim }) {
  const status = CLAIM_STATUS_META[claim.status];
  const date = new Date(claim.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return (
    <div className="flex items-center gap-4 px-4 py-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <KeyRound className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <Link href={`/properties/${claim.propertyId}`} className="t-label text-foreground hover:text-primary">
          View property
        </Link>
        <p className="mt-0.5 t-meta">
          {claim.role === 'OWNER' ? 'Owner' : 'Manager'} claim · {date}
        </p>
      </div>
      <Badge tone={status.tone}>{status.label}</Badge>
    </div>
  );
}

function MyReviewRow({ review, hasVerificationRequest }: { review: MyReview; hasVerificationRequest: boolean }) {
  const status = STATUS_META[review.status];
  const date = new Date(review.publishedAt ?? review.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const band = review.overall != null ? scoreBand(review.overall) : null;

  return (
    <div className="flex items-center gap-4 px-4 py-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <FileText className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <Link href={`/properties/${review.propertyId}`} className="t-label text-foreground hover:text-primary">
          {review.property.displayName}
        </Link>
        <p className="mt-0.5 t-meta">
          {TENURE_LABELS[review.tenure] ?? review.tenure} · {date}
          {review.isVerified ? ' · Verified' : ''}
        </p>
      </div>
      {review.overall != null && band && (
        <span className={cn('tabular t-label', band.color)}>{review.overall}</span>
      )}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Badge tone={status.tone}>{status.label}</Badge>
        {!review.isVerified && !hasVerificationRequest && review.status !== 'REMOVED' && (
          <Link
            href={`/verifications/new?propertyId=${encodeURIComponent(review.propertyId)}&reviewId=${encodeURIComponent(review.id)}`}
            className="inline-flex items-center gap-1 t-helper text-primary hover:underline"
          >
            <ShieldCheck className="size-3.5" aria-hidden /> Verify residency
          </Link>
        )}
      </div>
    </div>
  );
}
