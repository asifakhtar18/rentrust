'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * A small modal to capture an optional rejection reason before confirming a
 * destructive decision (reject verification / reject claim). Closes on Escape
 * and backdrop click. The reason is passed back to the caller.
 */
export function RejectDialog({
  title,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  busy?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 className="t-section-title text-foreground">{title}</h2>
        <p className="mt-1 t-helper">
          Add a short reason. It&apos;s shared with the requester so they understand the decision.
        </p>
        <textarea
          ref={ref}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="e.g. The uploaded document was unreadable."
          className="mt-4 w-full rounded-md border border-input bg-card px-3.5 py-2.5 t-body text-foreground placeholder:text-muted-foreground focus:border-primary"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" loading={busy} onClick={() => onConfirm(reason.trim())}>
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
