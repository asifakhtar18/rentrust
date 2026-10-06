/**
 * Object-storage abstraction. Verification and claim documents are sensitive,
 * so the application never proxies file bytes and never returns a public URL.
 * Instead it issues short-lived signed URLs for direct client<->storage
 * transfer. Callers depend on this interface, not S3/MinIO specifics, so the
 * provider can change without touching domain code.
 */
export interface PresignedUpload {
  /** The storage key the object will live under. Persist this, not a URL. */
  key: string;
  /** Short-lived URL the client PUTs the file to. */
  uploadUrl: string;
  /** When the upload URL stops working. */
  expiresAt: Date;
  /** Headers the client must send with the PUT (e.g. Content-Type). */
  requiredHeaders: Record<string, string>;
}

export interface StorageProvider {
  /**
   * Issues a presigned upload for a private object. `keyPrefix` namespaces the
   * object (e.g. `verification/<userId>`). Returns the key to persist.
   * Used for documents (PDFs) where the client uploads directly to storage.
   */
  createPresignedUpload(input: {
    keyPrefix: string;
    contentType: string;
    maxSizeBytes: number;
  }): Promise<PresignedUpload>;

  /**
   * Uploads bytes directly from the API server. Used for images, which are
   * compressed server-side before storage (so they cannot use the presigned
   * direct-to-storage path). Returns the stored key.
   */
  putObject(input: {
    keyPrefix: string;
    body: Buffer;
    contentType: string;
  }): Promise<{ key: string }>;

  /** Issues a short-lived download URL for an authorised reader (admins/mods). */
  createPresignedDownload(key: string): Promise<{ downloadUrl: string; expiresAt: Date }>;

  /** Deletes an object (e.g. on verification rejection cleanup). */
  delete(key: string): Promise<void>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

/** Validation limits applied before issuing an upload URL. */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
