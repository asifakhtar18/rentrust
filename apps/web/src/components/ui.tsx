import Link from 'next/link';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

/* Buttons — Linear/Vercel feel: tight radius, hairline borders, tactile press. */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 ' +
  'active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none select-none whitespace-nowrap';

const variants: Record<Variant, string> = {
  primary: 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 shadow-subtle',
  secondary: 'bg-zinc-900 text-zinc-100 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700',
  ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900',
  danger: 'bg-red-500/90 text-white hover:bg-red-500',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-[15px]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent opacity-70', className)}
    />
  );
}

/* Card — subtle zinc surface, hairline border, soft hover lift. */
export function Card({
  children,
  className,
  as: As = 'div',
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
  interactive?: boolean;
}) {
  return (
    <As
      className={cn(
        'rounded-xl border border-zinc-800/80 bg-zinc-900/40',
        interactive && 'transition-colors duration-200 hover:border-zinc-700 hover:bg-zinc-900/70',
        className,
      )}
    >
      {children}
    </As>
  );
}

/* Badge */
type Tone = 'neutral' | 'accent' | 'positive' | 'caution' | 'critical';
const tones: Record<Tone, string> = {
  neutral: 'bg-zinc-800/80 text-zinc-300 ring-zinc-700/50',
  accent: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  positive: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  caution: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  critical: 'bg-red-500/10 text-red-400 ring-red-500/20',
};

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}
    >
      {children}
    </span>
  );
}

/* Input + Field */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border bg-zinc-900/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-500',
        'transition-colors duration-150 focus:bg-zinc-900',
        invalid ? 'border-red-500/60' : 'border-zinc-800 focus:border-emerald-500/50',
        className,
      )}
      {...props}
    />
  );
});

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-300">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-red-400">{error}</p> : hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}
