'use client';

import { useState } from 'react';
import { Flag, Loader2, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

const REASONS = [
  ['PERSONAL_INFORMATION', 'Personal information'],
  ['THREATS', 'Threats or harassment'],
  ['HATE_SPEECH', 'Hate speech'],
  ['DEFAMATION', 'False or defamatory claims'],
  ['DOXXING', 'Private contact or address details'],
  ['SPAM', 'Spam or advertising'],
  ['OFF_TOPIC', 'Off-topic content'],
  ['OTHER', 'Something else'],
] as const;

export function ReportReviewButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reason) return;
    setSending(true);
    setError(null);
    try {
      await apiFetch(`/reviews/${reviewId}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason, ...(details.trim() ? { details: details.trim() } : {}) }),
      });
      setSent(true);
    } catch {
      setError('We couldn’t send the report. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setSent(false); setError(null); }} className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <Flag className="size-3.5" aria-hidden /> Report review
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-foreground/45 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !sending) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby={`report-title-${reviewId}`} className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id={`report-title-${reviewId}`} className="t-section-title text-foreground">Report this review</h2><p className="mt-2 t-meta">Tell our moderation team what may break the community guidelines. A negative opinion alone isn’t a violation.</p></div>
              <button type="button" aria-label="Close report dialog" onClick={() => setOpen(false)} disabled={sending} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" aria-hidden /></button>
            </div>
            {sent ? (
              <div role="status" className="mt-5 rounded-md border border-success/20 bg-success/10 p-4">
                <p className="t-label text-foreground">Report received</p><p className="mt-1 t-meta">A moderator will review it against the guidelines.</p>
                <Button className="mt-4" variant="secondary" size="sm" onClick={() => setOpen(false)}>Done</Button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-4">
                <div className="space-y-2">
                  <label htmlFor={`report-reason-${reviewId}`} className="t-label text-foreground">What’s the concern?</label>
                  <select id={`report-reason-${reviewId}`} required value={reason} onChange={(e) => setReason(e.target.value)} className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus:border-primary">
                    <option value="">Choose a reason</option>
                    {REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor={`report-details-${reviewId}`} className="t-label text-foreground">Anything else we should know? <span className="t-helper">Optional</span></label>
                  <textarea id={`report-details-${reviewId}`} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3} className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary" placeholder="Keep it brief and specific." />
                  <p className="text-right t-helper">{details.length}/1000</p>
                </div>
                {error && <p role="alert" className="t-meta text-destructive">{error}</p>}
                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={sending}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={!reason || sending}>{sending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Flag className="size-3.5" aria-hidden />} Send report</Button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
