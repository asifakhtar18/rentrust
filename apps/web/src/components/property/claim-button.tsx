'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { KeyRound, UploadCloud, CheckCircle2, X, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { ClaimRole, PresignedUpload, ClaimDocumentRef } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { MAX_PRIVATE_DOCUMENT_BYTES, preparePrivateDocument } from '@/lib/private-document';

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = MAX_PRIVATE_DOCUMENT_BYTES;

/**
 * Owner-facing "Claim this property" flow.
 *
 * Three real backend steps, matching the API contract:
 *   1. POST /claims/upload-url  -> { key, uploadUrl, requiredHeaders }
 *   2. PUT the file bytes to uploadUrl (direct-to-storage)
 *   3. POST /properties/:id/claim { role, documents: [{ storageKey, ... }] }
 *
 * Images are resized and re-encoded in the browser before direct upload.
 * Local mock storage returns a non-functional upload URL, so the PUT is skipped.
 */
export function ClaimButton({ propertyId, isClaimed }: { propertyId: string; isClaimed: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Already claimed — nothing to do.
  if (isClaimed) return null;

  function onClick() {
    if (!user) {
      router.push(`/login?next=/properties/${propertyId}`);
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <Button variant="secondary" size="md" onClick={onClick}>
        <KeyRound className="size-4" aria-hidden /> Claim this property
      </Button>
      {open && <ClaimDialog propertyId={propertyId} onClose={() => setOpen(false)} />}
    </>
  );
}

function ClaimDialog({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const { request } = useAuth();
  const [role, setRole] = useState<ClaimRole>('OWNER');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  function pickFile(f: File | null) {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!ALLOWED.includes(f.type)) {
      setError('Upload a PDF, JPEG, PNG, or WebP document.');
      return;
    }
    if (f.size > MAX_BYTES) {
      setError('File must be 10 MB or smaller.');
      return;
    }
    setFile(f);
  }

  async function submit() {
    if (!file) {
      setError('Attach a document that proves your ownership or management.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const prepared = await preparePrivateDocument(file);
      // 1) Ask the backend for a presigned upload scoped to this user.
      const presigned = await request<PresignedUpload>('/claims/upload-url', {
        method: 'POST',
        body: JSON.stringify({ contentType: prepared.contentType, sizeBytes: prepared.sizeBytes }),
      });

      // 2) Upload directly to storage. The local mock provider intentionally
      // has no upload endpoint; production uploads must succeed before a claim
      // can be created.
      if (new URL(presigned.uploadUrl).hostname !== 'mock-storage.local') {
        const uploadResponse = await fetch(presigned.uploadUrl, {
          method: 'PUT',
          headers: presigned.requiredHeaders,
          body: prepared.body,
        });
        if (!uploadResponse.ok) {
          throw new Error('Document upload failed. Please try again.');
        }
      }

      // 3) Create the claim referencing the uploaded document.
      const documents: ClaimDocumentRef[] = [
        {
          storageKey: presigned.key,
          contentType: prepared.contentType,
          sizeBytes: prepared.sizeBytes,
        },
      ];
      await request(`/properties/${propertyId}/claim`, {
        method: 'POST',
        body: JSON.stringify({ role, documents }),
      });

      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your claim.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Claim this property"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <KeyRound className="size-4" aria-hidden />
            </span>
            <h2 className="t-section-title text-foreground">Claim this property</h2>
          </div>
          <button
            onClick={() => !busy && onClose()}
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {done ? (
          <div className="mt-5 text-center">
            <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
            <p className="mt-3 t-label text-foreground">Claim submitted</p>
            <p className="mx-auto mt-1 max-w-xs t-helper">
              Our team will review your evidence. You can track the status under “My claims” in your
              profile.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-2 t-helper">
              Verify that you own or manage this property. Submitting sends your evidence to our
              team for review — approval grants you the matching role and the ability to respond
              publicly to reviews.
            </p>

            {/* Role */}
            <div className="mt-5">
              <p className="t-label text-foreground">Your relationship</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(['OWNER', 'MANAGER'] as ClaimRole[]).map((r, i) => (
                  <button
                    key={r}
                    ref={i === 0 ? firstFieldRef : undefined}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      'rounded-md border px-3 py-2.5 t-label transition-colors',
                      role === r
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {r === 'OWNER' ? 'Owner' : 'Manager'}
                  </button>
                ))}
              </div>
            </div>

            {/* Evidence */}
            <div className="mt-5">
              <p className="t-label text-foreground">Proof of ownership / management</p>
              <p className="mt-1 t-helper">
                PDF or image, up to 10 MB. e.g. sale deed, tax receipt, or management agreement.
              </p>
              <label
                className={cn(
                  'mt-2 flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-4 py-3.5 transition-colors',
                  file
                    ? 'border-primary/40 bg-primary/[0.04]'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <FileText className="size-5 shrink-0 text-primary" aria-hidden />
                ) : (
                  <UploadCloud className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate t-body text-foreground">
                    {file ? file.name : 'Choose a file'}
                  </span>
                  {file && (
                    <span className="block t-helper">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                </span>
              </label>
            </div>

            {error && (
              <p className="mt-4 flex items-center gap-2 t-meta text-destructive">
                <AlertCircle className="size-4 shrink-0" aria-hidden /> {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={busy} onClick={() => void submit()}>
                Submit claim
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
