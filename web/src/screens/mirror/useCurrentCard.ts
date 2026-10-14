import { useCallback, useEffect, useState } from 'react';
import { useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import type { AuraCardRow, ScanRow } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

export type CardState =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'error'; message: string }
  | { status: 'ready'; card: AuraCardRow; scan: ScanRow | null };

/** The signed-in user's current Aura Card plus the scan numbers behind it. */
export function useCurrentCard() {
  const profile = useProfile();
  const [state, setState] = useState<CardState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const card = await supabase.from('aura_cards').select('*').eq('user_id', profile.id).eq('is_current', true).maybeSingle();
      if (card.error) throw card.error;
      if (!card.data) return { status: 'none' } as const;
      let scan: ScanRow | null = null;
      if (card.data.scan_id) {
        const res = await supabase.from('scans').select('*').eq('id', card.data.scan_id).maybeSingle();
        if (res.error) throw res.error;
        scan = res.data;
      }
      return { status: 'ready', card: card.data, scan } as const;
    })()
      .then((s) => !cancelled && setState(s))
      .catch((err: unknown) => !cancelled && setState({ status: 'error', message: authErrorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [profile.id, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
