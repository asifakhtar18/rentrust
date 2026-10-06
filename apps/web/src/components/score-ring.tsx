import { cn } from '@/lib/cn';

/**
 * Resident Trust Score ring. An SVG arc that fills proportional to the 0–100
 * score, coloured by band, with the number in tabular figures at the centre.
 * The track + arc use round caps and a soft gradient so it reads as a crafted
 * dial, not a stock progress ring.
 */

export function scoreBand(score: number): { tone: string; label: string } {
  if (score >= 80) return { tone: 'var(--positive)', label: 'Excellent' };
  if (score >= 65) return { tone: 'var(--accent)', label: 'Good' };
  if (score >= 45) return { tone: 'var(--caution)', label: 'Mixed' };
  return { tone: 'var(--critical)', label: 'Poor' };
}

export function ScoreRing({
  score,
  size = 132,
  stroke = 12,
  label = true,
  className,
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: boolean;
  className?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * circumference;
  const band = scoreBand(clamped);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Trust score ${clamped} out of 100, ${band.label}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--ink) / 0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`rgb(${band.tone})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-title1 font-semibold leading-none text-ink">{clamped}</span>
        {label && <span className="mt-1 text-caption text-ink-tertiary">of 100</span>}
      </div>
    </div>
  );
}

/** Horizontal category bar used in the score breakdown. */
export function CategoryBar({ label, score, sampleSize }: { label: string; score: number; sampleSize?: number }) {
  const band = scoreBand(score);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-footnote text-ink-secondary">{label}</span>
        <span className="tabular text-footnote font-medium text-ink">
          {score}
          {sampleSize != null && (
            <span className="ml-1.5 text-ink-tertiary">· {sampleSize}</span>
          )}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/8">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(2, score)}%`,
            background: `rgb(${band.tone})`,
            transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      </div>
    </div>
  );
}
