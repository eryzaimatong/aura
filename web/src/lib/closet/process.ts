import { ApiError, tagItem, type TagResponse } from '../api';
import { base64ToBlob, toFallbackWebp, toUploadJpeg } from '../images';

export interface ProcessedPhoto {
  /** WebP to store: Mira's transparent cut-out, or the plain photo if tagging was unavailable. */
  image: Blob;
  /** null when tagging was unavailable — the user fills the form in by hand. */
  tags: TagResponse | null;
}

export class PhotoError extends Error {}

/** Garment photo → stored-ready WebP + Mira's suggestions (when the tagger is reachable). */
export async function processGarmentPhoto(file: File): Promise<ProcessedPhoto> {
  let jpeg: Blob;
  try {
    jpeg = await toUploadJpeg(file);
  } catch {
    throw new PhotoError('That file couldn’t be opened as a photo. Try a JPG or PNG.');
  }

  try {
    const tags = await tagItem(jpeg);
    return { image: base64ToBlob(tags.cutout_webp_base64, 'image/webp'), tags };
  } catch (err) {
    // Tagging is a helper, not a gate: offline or models missing → keep the photo, tag by hand.
    const recoverable = err instanceof TypeError || (err instanceof ApiError && err.status >= 500);
    if (!recoverable) {
      if (err instanceof ApiError && err.code === 'unreadable_image') throw new PhotoError('Mira couldn’t read that photo. Try another one.');
      if (err instanceof ApiError && err.code === 'image_too_large') throw new PhotoError('That photo is too large. Try a smaller one.');
      throw err;
    }
    const fallback = await toFallbackWebp(file);
    if (!fallback) throw new PhotoError('Mira can’t tag photos right now, and this device can’t save WebP. Try again later.');
    return { image: fallback, tags: null };
  }
}
