import { cn } from '@/lib/cn';

const bands = [
  { min: 80, color: '#10b981', label: 'Excellent' },
  { min: 65, color: '#a3a3a3', label: 'Good' },
  { min: 45, color: '#f59e0b', label: 'Mixed' },
  { min: 0, color: '#ef4444', label: 'Poor' },
] as const;

export function scoreBand(score: number) {
  return bands.find((b) => score >= b.min) ?? bands[bands.length - 1];
}

export function ScoreRing({
  score,
  size = 120,
  stroke = 10,
  label = true,
  className,
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: boolean;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * circ;
  const band = scoreBand(clamped);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Trust score ${clamped} out of 100, ${band.label}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-zinc-800/60" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={band.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular-nums text-2xl font-semibold text-zinc-100">{clamped}</span>
        {label && <span className="mt-0.5 text-[11px] text-zinc-500">/100</span>}
      </div>
    </div>
  );
}

export function CategoryBar({ label: title, score }: { label: string; score: number }) {
  const band = scoreBand(score);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-zinc-400">{title}</span>
        <span className="tabular-nums font-medium text-zinc-200">{score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800/80">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.max(2, score)}%`, backgroundColor: band.color }}
        />
      </div>
    </div>
  );
}
