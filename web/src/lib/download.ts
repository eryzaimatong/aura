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
