'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, Field } from '@/components/ui/primitives';
import { useAuth } from '@/lib/auth-context';
import type { PresignedUpload, PropertyImage } from '@/lib/types';
import { MAX_PRIVATE_DOCUMENT_BYTES, preparePrivateDocument } from '@/lib/private-document';

const MAX_IMAGES = 12;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function PropertyImages({
  propertyId,
  propertyName,
  images,
}: {
  propertyId: string;
  propertyName: string;
  images: PropertyImage[];
}) {
  const { user, request } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [altText, setAltText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const isAdmin = user?.roles.includes('ADMIN') ?? false;

  function selectFiles(fileList: FileList | null) {
    setError(null);
    setStatus(null);
    const next = Array.from(fileList ?? []);
    const remaining = MAX_IMAGES - images.length;
    if (next.length > remaining) {
      setFiles([]);
      setError(
        `You can add ${Math.max(0, remaining)} more photo${remaining === 1 ? '' : 's'} (maximum ${MAX_IMAGES}).`,
      );
      return;
    }
    const invalid = next.find(
      (file) => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_PRIVATE_DOCUMENT_BYTES,
    );
    if (invalid) {
      setFiles([]);
      setError(`${invalid.name} must be a JPEG, PNG, or WebP image up to 10 MB.`);
      return;
    }
    setFiles(next);
  }

  async function uploadPhotos() {
    if (!files.length) {
      setError('Choose at least one image first.');
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      for (const file of files) {
        const prepared = await preparePrivateDocument(file);
        const presigned = await request<PresignedUpload>(
          `/properties/${propertyId}/images/upload-url`,
          {
            method: 'POST',
            body: JSON.stringify({
              contentType: prepared.contentType,
              sizeBytes: prepared.sizeBytes,
            }),
          },
        );
        if (new URL(presigned.uploadUrl).hostname === 'mock-storage.local') {
          throw new Error('Photo storage is not configured for this environment yet.');
        }
        const response = await fetch(presigned.uploadUrl, {
          method: 'PUT',
          headers: presigned.requiredHeaders,
          body: prepared.body,
        });
        if (!response.ok) throw new Error(`Could not upload ${file.name}. Please try again.`);
        await request(`/properties/${propertyId}/images`, {
          method: 'POST',
          body: JSON.stringify({
            storageKey: presigned.key,
            contentType: prepared.contentType,
            sizeBytes: prepared.sizeBytes,
            altText: altText.trim() || `${propertyName} property photo`,
          }),
        });
      }
      setFiles([]);
      setAltText('');
      if (inputRef.current) inputRef.current.value = '';
      setStatus(`${files.length} photo${files.length === 1 ? '' : 's'} added.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload the selected photos.');
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(image: PropertyImage) {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await request(`/properties/${propertyId}/images/${image.id}`, { method: 'DELETE' });
      setStatus('Photo removed.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove this photo.');
    } finally {
      setBusy(false);
    }
  }

  if (images.length === 0 && !isAdmin) return null;

  return (
    <Card className="mt-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ImagePlus className="size-4 text-primary" aria-hidden />
            <h2 className="t-title3 text-foreground">Property photos</h2>
          </div>
          <p className="mt-1 t-helper">
            Photos help renters recognize the building and its shared spaces.
          </p>
        </div>
        {isAdmin && (
          <span className="t-helper">
            {images.length}/{MAX_IMAGES} photos
          </span>
        )}
      </div>

      {images.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <figure
              key={image.id}
              className="group relative overflow-hidden rounded-md border border-border bg-muted"
            >
              {/* Storage host is configured per deployment, so use the browser's native image loader. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.altText || `${propertyName} property photo`}
                width={1200}
                height={800}
                loading="lazy"
                className="aspect-[3/2] w-full object-cover"
              />
              {isAdmin && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  className="absolute right-2 top-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  aria-label={`Remove photo of ${propertyName}`}
                  onClick={() => void removeImage(image)}
                >
                  <Trash2 className="size-4" aria-hidden /> Remove
                </Button>
              )}
            </figure>
          ))}
        </div>
      )}

      {isAdmin && images.length < MAX_IMAGES && (
        <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field
            label="Choose photos"
            htmlFor="property-photos"
            hint="JPEG, PNG, or WebP. Up to 10 MB each; images are resized before upload."
          >
            <input
              ref={inputRef}
              id="property-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={busy}
              aria-describedby="property-photos-help property-photos-message"
              onChange={(event) => selectFiles(event.target.files)}
              className="block w-full rounded-md border border-border bg-background px-3 py-2 t-meta text-foreground file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:font-medium file:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            />
            <span id="property-photos-help" className="sr-only">
              Select up to {MAX_IMAGES - images.length} image files.
            </span>
          </Field>
          <Field label="Image description (optional)" htmlFor="property-photo-alt">
            <input
              id="property-photo-alt"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              maxLength={200}
              disabled={busy}
              placeholder="e.g. Main entrance"
              className="h-11 w-full rounded-md border border-input bg-card px-3.5 t-body text-foreground focus:border-primary"
            />
          </Field>
          <Button
            type="button"
            loading={busy}
            disabled={!files.length}
            onClick={() => void uploadPhotos()}
          >
            <UploadCloud className="size-4" aria-hidden /> Add photos
          </Button>
        </div>
      )}

      <p
        id="property-photos-message"
        className="mt-3 t-helper"
        aria-live="polite"
        role={error ? 'alert' : 'status'}
      >
        {error ??
          status ??
          (files.length ? `${files.length} photo${files.length === 1 ? '' : 's'} selected.` : '')}
      </p>
    </Card>
  );
}
