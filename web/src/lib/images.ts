/** Garment photo helpers. (Selfies never come through here — they stay in lib/face.) */

async function drawScaled(file: Blob, maxSide: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the photo.'))), type, quality),
  );
}

/** Any picked photo (HEIC excepted) → JPEG ≤ 1280px, ready for the tagging endpoint. */
export async function toUploadJpeg(file: File): Promise<Blob> {
  return toBlob(await drawScaled(file, 1280), 'image/jpeg', 0.9);
}

/**
 * Used when tagging is unavailable: the plain photo as WebP (the bucket accepts WebP only).
 * Returns null where the browser can't encode WebP.
 */
export async function toFallbackWebp(file: File): Promise<Blob | null> {
  const blob = await toBlob(await drawScaled(file, 768), 'image/webp', 0.85);
  return blob.type === 'image/webp' ? blob : null;
}

export function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}
