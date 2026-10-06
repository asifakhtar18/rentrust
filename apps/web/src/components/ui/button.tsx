import Link from 'next/link';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

/*
 * Button — border-led, restrained. Primary uses the indigo brand token.
 * Tactile press (scale), accessible focus from globals. One radius scale.
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 ' +
  'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-foreground hover:bg-brand-hover shadow-sm',
  secondary: 'bg-surface text-foreground border border-border hover:bg-surface-hover',
  ghost: 'text-text-secondary hover:text-foreground hover:bg-surface-hover',
  danger: 'bg-danger text-white hover:brightness-95',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-small',
  md: 'h-10 px-4 text-small',
  lg: 'h-12 px-6 text-body',
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
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
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
