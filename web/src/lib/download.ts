import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNative } from './native';

/**
 * Hands a text file to the user. Browser: a normal download. Android app: written to the
 * app's private cache, then the share sheet lets the user save it to Files, Drive, etc.
 */
export async function saveTextFile(fileName: string, text: string, mime = 'application/json'): Promise<void> {
  if (isNative) {
    const { uri } = await Filesystem.writeFile({ path: fileName, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: fileName, url: uri, dialogTitle: 'Save your AURA data' });
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error ?? new Error('Couldn’t read the image.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Hands an image to the share sheet. Android app: via the app's cache. Browser: Web Share
 * with files where supported, otherwise a download. Returns false if the person cancelled.
 */
export async function shareImage(fileName: string, blob: Blob, text: string): Promise<boolean> {
  try {
    if (isNative) {
      const { uri } = await Filesystem.writeFile({ path: fileName, data: await blobToBase64(blob), directory: Directory.Cache });
      await Share.share({ title: 'My Aura Card', text, url: uri, dialogTitle: 'Share your Aura Card' });
      return true;
    }
    const file = new File([blob], fileName, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return true;
    }
  } catch (err) {
    // Closing the share sheet isn't an error.
    if (err instanceof Error && (err.name === 'AbortError' || /cancel/i.test(err.message))) return false;
    throw err;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
