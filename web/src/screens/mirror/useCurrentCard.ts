import { useCallback, useEffect, useState } from 'react';
import { useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import type { AuraCardRow, ScanRow } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

/** Card fields the user has overridden — shown as "set by you", not as model confidence. */
export interface UserSet {
  faceShape: boolean;
  colors: boolean;
}

export type CardState =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'error'; message: string }
  | { status: 'ready'; card: AuraCardRow; scan: ScanRow | null; userSet: UserSet };

/** The signed-in user's current Aura Card, the scan numbers behind it, and what they corrected. */
export function useCurrentCard() {
  const profile = useProfile();
  const [state, setState] = useState<CardState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async (): Promise<CardState> => {
      const card = await supabase.from('aura_cards').select('*').eq('user_id', profile.id).eq('is_current', true).maybeSingle();
      if (card.error) throw card.error;
      if (!card.data) return { status: 'none' };

      const [scan, corrections] = await Promise.all([
        card.data.scan_id
          ? supabase.from('scans').select('*').eq('id', card.data.scan_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.from('card_corrections').select('target, corrected_to').eq('card_id', card.data.id).not('corrected_to', 'is', null),
      ]);
      if (scan.error) throw scan.error;
      if (corrections.error) throw corrections.error;

      const targets = new Set(corrections.data.map((c) => c.target));
      return {
        status: 'ready',
        card: card.data,
        scan: scan.data,
        // A new undertone re-derives the season, so either one means the colours are the user's.
        userSet: { faceShape: targets.has('face_shape'), colors: targets.has('season') || targets.has('undertone') },
      };
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
