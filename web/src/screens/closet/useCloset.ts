import { useCallback, useEffect, useState } from 'react';
import { useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import { listItems, signedUrls, wearLog, type ClosetItem } from '../../lib/closet/data';
import type { WearLogRow } from '../../lib/database.types';

export type ClosetState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: ClosetItem[]; urls: Map<string, string>; log: Pick<WearLogRow, 'item_id' | 'worn_on'>[] };

/** The user's closet with photo links and the wear log. `reload` after any change. */
export function useCloset() {
  const profile = useProfile();
  const [state, setState] = useState<ClosetState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async (): Promise<ClosetState> => {
      const [items, log] = await Promise.all([listItems(profile.id), wearLog(profile.id)]);
      const urls = await signedUrls(items.map((i) => i.image_path));
      return { status: 'ready', items, urls, log };
    })()
      .then((s) => !cancelled && setState(s))
      .catch((err: unknown) => !cancelled && setState({ status: 'error', message: authErrorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [profile.id, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, reload };
}
