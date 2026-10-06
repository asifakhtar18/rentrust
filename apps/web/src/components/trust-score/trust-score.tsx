import { cn } from '@/lib/cn';

/*
 * Trust Score — simple, numeric, transparent. No giant gauge (per skill).
 * Score is 0–100 from the backend. Band pairs color WITH a text label, never
 * color alone. Always shows sample size for honesty.
 */

export function scoreBand(score: number): { label: string; color: string; bar: string } {
  if (score >= 80) return { label: 'Excellent', color: 'text-success', bar: 'bg-success' };
  if (score >= 65) return { label: 'Good', color: 'text-success', bar: 'bg-success/80' };
  if (score >= 45) return { label: 'Average', color: 'text-warning', bar: 'bg-warning' };
  if (score >= 30) return { label: 'Poor', color: 'text-warning', bar: 'bg-orange-500' };
  return { label: 'Very poor', color: 'text-danger', bar: 'bg-danger' };
}

/** The headline score block: big number + band + sample size. */
export function TrustScore({
  score,
  sampleSize,
  size = 'lg',
  className,
}: {
  score: number;
  sampleSize: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const band = scoreBand(score);
  const numCls = size === 'lg' ? 'text-5xl' : size === 'md' ? 'text-3xl' : 'text-2xl';
  return (
    <div className={cn('flex items-baseline gap-3', className)}>
      <span className={cn('tabular font-semibold tracking-tight text-foreground', numCls)}>{score}</span>
      <div>
        <p className={cn('text-small font-medium', band.color)}>{band.label} trust</p>
        <p className="text-caption text-text-tertiary">
          {sampleSize} verified {sampleSize === 1 ? 'experience' : 'experiences'}
        </p>
      </div>
    </div>
  );
}

/** A single category row: label + value + thin bar. */
export function CategoryRow({ label, score }: { label: string; score: number }) {
  const band = scoreBand(score);
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-small text-text-secondary">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface-hover">
        <div className={cn('h-full rounded-pill transition-all duration-500', band.bar)} style={{ width: `${Math.max(3, score)}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-small font-medium tabular text-foreground">{score}</span>
    </div>
  );
}

/** Compact inline score pill for cards / lists. */
export function ScorePill({ score }: { score: number }) {
  const band = scoreBand(score);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1">
      <span className={cn('size-1.5 rounded-full', band.bar)} aria-hidden />
      <span className="tabular text-small font-semibold text-foreground">{score}</span>
      <span className="text-caption text-text-tertiary">{band.label}</span>
    </span>
  );
}
