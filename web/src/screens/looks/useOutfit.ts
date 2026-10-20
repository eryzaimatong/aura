import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, generateOutfit, saveOutfit, wearOutfit, type GeneratedOutfit, type Occasion, type WeatherNow } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiErrors';
import { track } from '../../lib/analytics';
import { useProfile } from '../../lib/auth/context';
import { localToday } from '../../lib/closet/data';

export type OutfitState =
  | { status: 'loading' }
  | { status: 'ready'; outfit: GeneratedOutfit }
  | { status: 'need_items'; missing: string }
  | { status: 'error'; message: string };

/**
 * One generated outfit at a time. `weather === undefined` means "still loading, wait";
 * `null` means generate without weather.
 */
export function useOutfit(occasion: Occasion | null, weather: WeatherNow | null | undefined,
  { trackGenerated = true, requireId = null }: { trackGenerated?: boolean; requireId?: string | null } = {}) {
  const profile = useProfile();
  const [seed, setSeed] = useState(0);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [state, setState] = useState<OutfitState>({ status: 'loading' });

  const w = useMemo(() => (weather ? { temp_c: weather.temp_c, feels_c: weather.feels_c, rain_pct: weather.rain_pct } : null), [weather]);
  const key = JSON.stringify([occasion, w, seed, avoid, requireId]);

  useEffect(() => {
    if (weather === undefined) return;
    let cancelled = false;
    setState({ status: 'loading' });
    generateOutfit({ occasion, weather: w, seed, avoid_ids: avoid, require_id: requireId })
      .then((outfit) => {
        if (cancelled) return;
        setState({ status: 'ready', outfit });
        if (trackGenerated) track(profile, 'outfit_generated', { occasion, generator_v: outfit.generator_v, pieces: outfit.pieces.length });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code.startsWith('need_items:')) {
          setState({ status: 'need_items', missing: err.code.slice('need_items:'.length) });
        } else {
          setState({ status: 'error', message: apiErrorMessage(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- `key` captures every input

  /** Another outfit that moves away from the one on screen. */
  const shuffle = useCallback(() => {
    if (state.status === 'ready') setAvoid(state.outfit.pieces.map((p) => p.id));
    setSeed((s) => s + 1);
  }, [state]);

  /** Records the outfit and logs today's wear for every piece. */
  const wear = useCallback(async () => {
    if (state.status !== 'ready') return null;
    const { outfit } = state;
    const res = await wearOutfit({
      item_ids: outfit.pieces.map((p) => p.id), occasion, weather: w, reason: outfit.reason,
      generator_v: outfit.generator_v, worn_on: localToday(),
    });
    track(profile, 'outfit_worn', { occasion, generator_v: outfit.generator_v, pieces: outfit.pieces.length });
    return res;
  }, [state, occasion, w, profile]);

  /** Keeps the outfit on screen in Saved looks. */
  const save = useCallback(async () => {
    if (state.status !== 'ready') return null;
    const { outfit } = state;
    return saveOutfit({
      item_ids: outfit.pieces.map((p) => p.id), occasion, weather: w, reason: outfit.reason, generator_v: outfit.generator_v,
    });
  }, [state, occasion, w]);

  return { state, shuffle, wear, save };
}
