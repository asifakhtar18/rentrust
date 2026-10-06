import Link from 'next/link';
import type { ReactNode } from 'react';

/** Centered, calm shell for authentication screens. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center px-5 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-60"
        style={{
          background: 'radial-gradient(50% 50% at 50% 0%, rgb(var(--accent) / 0.12), transparent 70%)',
        }}
      />
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-ink shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3.2 4.5 8.4v9.1c0 .6.5 1.1 1.1 1.1h3.1v-5.3c0-.6.5-1.1 1.1-1.1h4.2c.6 0 1.1.5 1.1 1.1v5.3h3.1c.6 0 1.1-.5 1.1-1.1V8.4L12 3.2Z"
                fill="currentColor"
              />
            </svg>
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
