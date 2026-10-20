import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import { ensureFresh, invalidateCloset, snapshot, subscribe, type ClosetState } from '../../lib/closet/cache';

export type { ClosetState };

// How often an open screen checks whether photo links need renewing.
const CHECK_EVERY_MS = 5 * 60_000;

/** The user's closet with photo links and the wear log, shared across screens. `reload` after any change. */
export function useCloset() {
  const profile = useProfile();
  const userId = profile.id;
  const state = useSyncExternalStore(subscribe, () => snapshot(userId));

  useEffect(() => {
    const check = () => void ensureFresh(userId, authErrorMessage);
    check();
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    // Back from the background (or the phone waking up): links may have expired meanwhile.
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);

  const reload = useCallback(() => {
    invalidateCloset();
    void ensureFresh(userId, authErrorMessage, true);
  }, [userId]);

  return { state, reload };
}
