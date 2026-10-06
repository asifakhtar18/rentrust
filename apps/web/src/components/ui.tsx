import Link from 'next/link';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

/* -------------------------------------------------------------------------- */
/* Button — pill-shaped, Apple-style weights with a quiet press settle.        */
/* -------------------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 ' +
  'ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.95] hover:-translate-y-0.5 ' +
  'disabled:opacity-40 disabled:pointer-events-none disabled:translate-y-0 select-none';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:shadow-glow',
  secondary: 'pill text-ink hover:bg-surface-raised',
  ghost: 'text-ink-secondary hover:text-ink hover:bg-ink/5',
  danger: 'bg-critical text-white hover:shadow-glow-coral',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-footnote',
  md: 'h-11 px-6 text-body',
  lg: 'h-13 px-8 text-callout',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
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
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
    >
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent opacity-70',
        className,
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Card — a soft, raised material. Used sparingly, not as the whole page.      */
/* -------------------------------------------------------------------------- */

export function Card({
  children,
  className,
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}) {
  return <As className={cn('glass-card rounded-2xl', className)}>{children}</As>;
}

/* -------------------------------------------------------------------------- */
/* Badge / Pill                                                                */
/* -------------------------------------------------------------------------- */

type BadgeTone = 'neutral' | 'accent' | 'positive' | 'caution' | 'critical';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-ink/5 text-ink-secondary',
  accent: 'bg-accent/10 text-accent',
  positive: 'bg-positive/10 text-positive',
  caution: 'bg-caution/10 text-caution',
  critical: 'bg-critical/10 text-critical',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-medium',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Input + Field                                                               */
/* -------------------------------------------------------------------------- */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-xl bg-canvas px-4 text-body text-ink placeholder:text-ink-tertiary',
        'border transition-colors duration-150 ease-out',
        invalid ? 'border-critical/60' : 'border-hairline/15 focus:border-accent/50',
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
      <label htmlFor={htmlFor} className="block text-footnote font-medium text-ink-secondary">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-caption text-critical">{error}</p>
      ) : hint ? (
        <p className="text-caption text-ink-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}
