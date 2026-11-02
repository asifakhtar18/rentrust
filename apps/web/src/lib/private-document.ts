export const MAX_PRIVATE_DOCUMENT_BYTES = 10 * 1024 * 1024;

export interface PreparedPrivateDocument {
  body: Blob;
  contentType: string;
  sizeBytes: number;
}

/** Resize private images in the browser, removing embedded metadata before R2 upload. */
export async function preparePrivateDocument(file: File): Promise<PreparedPrivateDocument> {
  if (file.size < 1 || file.size > MAX_PRIVATE_DOCUMENT_BYTES) {
    throw new Error(`${file.name} must be 10 MiB or smaller.`);
  }
  if (file.type === 'application/pdf') {
    return { body: file, contentType: file.type, sizeBytes: file.size };
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error(`${file.name} must be a PDF, JPEG, PNG, or WebP file.`);
  }

  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file);
  } catch {
    throw new Error(`Could not read ${file.name} as an image.`);
  }

  try {
    const scale = Math.min(1, 2000 / image.width, 2000 / image.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error(`Could not process ${file.name}.`);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const body = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error(`Could not process ${file.name}.`))),
        'image/webp',
        0.8,
      );
    });
    if (body.type !== 'image/webp' || body.size < 1 || body.size > MAX_PRIVATE_DOCUMENT_BYTES) {
      throw new Error(`Could not compress ${file.name} to a WebP image under 10 MiB.`);
    }
    return { body, contentType: body.type, sizeBytes: body.size };
  } finally {
    image.close();
  }
}
