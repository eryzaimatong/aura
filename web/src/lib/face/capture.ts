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

/** True when nearly every sampled pixel is black (what some webviews return for a camera frame). */
function looksBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return true;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.length; i += 4 * 211) {
    if ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0) > 24) return false;
  }
  return true;
}

// Not in every TypeScript DOM lib yet.
type ImageCaptureCtor = new (track: MediaStreamTrack) => { grabFrame(): Promise<ImageBitmap> };

/**
 * Freezes the current camera frame. Some Android webviews give drawImage(video) a black frame;
 * then the frame is grabbed straight from the camera track instead.
 */
export async function frameToCanvas(video: HTMLVideoElement): Promise<HTMLCanvasElement | null> {
  if (!video.videoWidth || !video.videoHeight) return null;
  const canvas = scaledCanvas(video.videoWidth, video.videoHeight, (ctx, w, h) => ctx.drawImage(video, 0, 0, w, h));
  if (!looksBlank(canvas)) return canvas;
  const track = video.srcObject instanceof MediaStream ? video.srcObject.getVideoTracks()[0] : undefined;
  const Capture = (window as unknown as { ImageCapture?: ImageCaptureCtor }).ImageCapture;
  if (!track || !Capture) return canvas;
  try {
    const bitmap = await new Capture(track).grabFrame();
    try {
      return scaledCanvas(bitmap.width, bitmap.height, (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h));
    } finally {
      bitmap.close();
    }
  } catch {
    return canvas;
  }
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
