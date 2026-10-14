/** Gets a photo into an in-memory canvas. Nothing here touches the network or storage. */

const MAX_SIDE = 1280;

function scaledCanvas(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not available on this device.');
  draw(ctx, canvas.width, canvas.height);
  return canvas;
}

/** Freezes the current camera frame. */
export function frameToCanvas(video: HTMLVideoElement): HTMLCanvasElement | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  return scaledCanvas(video.videoWidth, video.videoHeight, (ctx, w, h) => ctx.drawImage(video, 0, 0, w, h));
}

/** Decodes a picked file locally (EXIF rotation applied), then drops the decoded bitmap. */
export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    return scaledCanvas(bitmap.width, bitmap.height, (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h));
  } finally {
    bitmap.close();
  }
}
