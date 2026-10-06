'use client';

import { cn } from '@/lib/cn';
import { humanizeTag } from '@/lib/labels';

/** 1–5 rating selector with descriptive end labels. */
export function RatingPicker({
  value,
  onChange,
  lowLabel = 'Poor',
  highLabel = 'Great',
}: {
  value: number | null;
  onChange: (v: number) => void;
  lowLabel?: string;
  highLabel?: string;
}) {
  return (
    <div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            className={cn(
              'flex h-12 flex-1 items-center justify-center rounded-xl text-callout font-medium transition-all duration-150 ease-out active:scale-95',
              value === n
                ? 'bg-accent text-accent-ink shadow-sm'
                : 'bg-canvas text-ink-secondary hover:bg-ink/5',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-caption text-ink-tertiary">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

/** Single-select chip group for enum choices. */
export function ChoicePicker<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | null;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            'rounded-xl px-4 py-2.5 text-footnote font-medium transition-all duration-150 ease-out active:scale-95',
            value === o.value ? 'bg-ink text-canvas' : 'bg-canvas text-ink-secondary hover:bg-ink/5',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Multi-select tag chips. */
export function TagPicker({
  values,
  onChange,
  options,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: readonly string[];
}) {
  const toggle = (tag: string) =>
    onChange(values.includes(tag) ? values.filter((t) => t !== tag) : [...values, tag]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => toggle(tag)}
          aria-pressed={values.includes(tag)}
          className={cn(
            'rounded-full px-3.5 py-2 text-footnote transition-all duration-150 ease-out active:scale-95',
            values.includes(tag)
              ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
              : 'bg-canvas text-ink-secondary hover:bg-ink/5',
          )}
        >
          {humanizeTag(tag)}
        </button>
      ))}
    </div>
  );
}
