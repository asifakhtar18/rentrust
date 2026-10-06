import { forwardRef, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* Card — border-led surface, shadow only when `elevated`. */
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
        'rounded-lg border border-border bg-surface',
        elevated && 'shadow-sm',
        interactive && 'transition-all duration-150 hover:border-text-tertiary/40 hover:shadow-md',
        className,
      )}
    >
      {children}
    </As>
  );
}

/* Badge — pairs color with text (never color alone, per trust rule). */
type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
const tones: Record<Tone, string> = {
  neutral: 'bg-surface-hover text-text-secondary border-border',
  brand: 'bg-brand-muted text-brand border-brand/15',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
};

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-caption font-medium', tones[tone], className)}>
      {children}
    </span>
  );
}

/* Eyebrow — small uppercase label. Used sparingly (hero + rare section). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-caption font-medium uppercase tracking-[0.14em] text-text-tertiary', className)}>{children}</p>
  );
}

/* Input + Field — label above, error below (per form rule). */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-md border bg-surface px-3.5 text-body text-foreground placeholder:text-text-tertiary',
        'transition-colors duration-150',
        invalid ? 'border-danger focus:border-danger' : 'border-border focus:border-brand',
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
      <label htmlFor={htmlFor} className="block text-small font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? <p className="text-caption text-danger">{error}</p> : hint ? <p className="text-caption text-text-tertiary">{hint}</p> : null}
    </div>
  );
}

/* Section wrapper for editorial rhythm. */
export function Section({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn('mx-auto max-w-[1200px] px-6', className)} {...props}>
      {children}
    </section>
  );
}

/* EmptyState — honest, explains what's missing + what to do. */
export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
      <p className="text-h4 font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-small text-text-secondary">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
