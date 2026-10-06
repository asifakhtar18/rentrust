import { notFound } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import type { LocalityIntelligence } from '@/lib/types';
import { CATEGORY_LABELS, humanizeTag } from '@/lib/labels';
import { Badge, Card } from '@/components/ui';
import { ScoreRing, CategoryBar, scoreBand } from '@/components/score-ring';

export const dynamic = 'force-dynamic';

async function getIntel(id: string): Promise<LocalityIntelligence> {
  try {
    const { data } = await apiFetch<LocalityIntelligence>(`/localities/${id}`);
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
}

export default async function LocalityPage({ params }: { params: { id: string } }) {
  const intel = await getIntel(params.id);
  const band =
    intel.hasEnoughData && intel.averageTrustScore != null ? scoreBand(intel.averageTrustScore) : null;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <p className="text-footnote text-ink-tertiary">Locality · Bengaluru</p>
      <h1 className="mt-1 text-title1 font-semibold tracking-tight text-ink">{intel.locality.name}</h1>
      <p className="mt-1 text-callout text-ink-secondary">
        {intel.propertyCount} {intel.propertyCount === 1 ? 'property' : 'properties'} tracked
        {intel.totalReviews ? ` · ${intel.totalReviews} resident responses` : ''}
      </p>

      {!intel.hasEnoughData ? (
        <Card className="mt-7 p-10 text-center">
          <p className="text-callout font-medium text-ink">Not enough verified resident data yet</p>
          <p className="mx-auto mt-1 max-w-md text-footnote text-ink-secondary">
            As residents review properties here, we&apos;ll surface locality-wide sentiment,
            common complaints, and an average trust score.
          </p>
        </Card>
      ) : (
        <div className="mt-7 grid gap-5 lg:grid-cols-[320px_1fr]">
          <Card className="flex flex-col items-center p-7">
            <ScoreRing score={intel.averageTrustScore!} size={160} stroke={14} />
            <p className="mt-4 text-callout font-medium text-ink">{band?.label} overall</p>
            <p className="mt-1 text-center text-footnote text-ink-tertiary">
              Average across {intel.scoredPropertyCount} scored{' '}
              {intel.scoredPropertyCount === 1 ? 'property' : 'properties'}
            </p>
          </Card>

          <div className="space-y-5">
            {intel.categoryAverages && (
              <Card className="p-6">
                <h2 className="mb-4 text-title3 font-semibold tracking-tight text-ink">
                  Resident sentiment
                </h2>
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {Object.entries(intel.categoryAverages).map(([key, score]) => (
                    <CategoryBar key={key} label={CATEGORY_LABELS[key] ?? key} score={score} />
                  ))}
                </div>
              </Card>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <ThemeCard title="Common positive themes" tone="positive" themes={intel.commonPositiveThemes ?? []} />
              <ThemeCard title="Common complaints" tone="critical" themes={intel.commonComplaints ?? []} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeCard({ title, tone, themes }: { title: string; tone: 'positive' | 'critical'; themes: string[] }) {
  return (
    <Card className="p-6">
      <h3 className="mb-3 text-footnote font-medium text-ink-secondary">{title}</h3>
      {themes.length === 0 ? (
        <p className="text-footnote text-ink-tertiary">Not enough data yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {themes.map((t) => (
            <Badge key={t} tone={tone === 'positive' ? 'positive' : 'caution'}>
              {humanizeTag(t)}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
