'use client';

import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Pointer-tracking 3D tilt card. Rotates toward the cursor with a soft spring
 * and a moving sheen, then settles flat on leave. Honors reduced-motion by
 * degrading to a simple lift (handled in CSS). Pure transform/opacity so it
 * stays GPU-cheap.
 */
export function TiltCard({
  children,
  className,
  intensity = 8,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * intensity}deg) rotateX(${-py * intensity}deg) translateY(-4px)`;
    el.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
    el.style.setProperty('--my', `${(py + 0.5) * 100}%`);
  }

  function reset() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(900px) rotateY(0) rotateX(0) translateY(0)';
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={cn(
        'group relative overflow-hidden rounded-3xl transition-[transform,box-shadow] duration-300 ease-out will-change-transform',
        className,
      )}
    >
      {/* Cursor-following sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(18rem 18rem at var(--mx,50%) var(--my,50%), rgb(var(--accent) / 0.12), transparent 60%)',
        }}
      />
      {children}
    </div>
  );
}
