import { forwardRef, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* Card — border-led surface over the warm canvas. Shadow only when `elevated`. */
export function Card({
  children,
  className,
  as: As = 'div',
  interactive = false,
  elevated = false,
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
  interactive?: boolean;
  elevated?: boolean;
}) {
  return (
    <As
      className={cn(
        'rounded-lg border border-border bg-card',
        elevated && 'shadow-sm',
        interactive &&
          'transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md',
        className,
      )}
    >
      {children}
    </As>
  );
}

/* Badge — color always paired with text (never color alone). */
type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
const tones: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground border-border',
  brand: 'bg-primary/10 text-primary border-primary/15',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('eyebrow', className)}>{children}</p>;
}

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
        'h-11 w-full rounded-md border bg-card px-3.5 t-body text-foreground placeholder:text-muted-foreground',
        'transition-colors duration-150',
        invalid
          ? 'border-destructive focus:border-destructive'
          : 'border-input focus:border-primary',
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
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block t-label text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p className="t-helper text-destructive">{error}</p>
      ) : hint ? (
        <p className="t-helper">{hint}</p>
      ) : null}
    </div>
  );
}

export function Section({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn('mx-auto w-full max-w-[1200px] px-4 sm:px-6', className)} {...props}>
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <p className="t-section-title text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-sm t-body text-muted-foreground">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
