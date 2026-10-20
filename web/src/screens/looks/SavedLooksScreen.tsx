import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { wearOutfit, type GeneratedOutfit, type Occasion } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiErrors';
import { track } from '../../lib/analytics';
import { useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import { localToday } from '../../lib/closet/data';
import { supabase } from '../../lib/supabase';
import { FormAlert } from '../onboarding/FormAlert';
import { useCloset } from '../closet/useCloset';
import { OutfitCollage } from './OutfitCollage';

const OCCASION_LABEL: Record<Occasion, string> = {
  casual: 'Casual', class: 'Class', work: 'Work', date: 'Date', formal: 'Formal', travel: 'Travel',
};

type Look = {
  id: string;
  occasion: Occasion | null;
  reason: string;
  generator_v: string;
  created_at: string;
  pieces: GeneratedOutfit['pieces'];
};

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; looks: Look[] };

export function SavedLooksScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const { state: closet, reload: reloadCloset } = useCloset();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [busy, setBusy] = useState<string | null>(null);
  const [worn, setWorn] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<Look[]> => {
    const { data: outfits, error: e1 } = await supabase.from('outfits').select('*')
      .eq('user_id', profile.id).eq('saved', true).order('created_at', { ascending: false });
    if (e1) throw e1;
    if (outfits.length === 0) return [];
    const { data: rows, error: e2 } = await supabase.from('outfit_items').select('*').in('outfit_id', outfits.map((o) => o.id));
    if (e2) throw e2;
    return outfits.map((o) => ({
      id: o.id,
      occasion: o.occasion as Occasion | null,
      reason: o.reason ?? '',
      generator_v: o.generator_v,
      created_at: o.created_at,
      pieces: rows.filter((r) => r.outfit_id === o.id).map((r) => ({ id: r.item_id, slot: r.slot as GeneratedOutfit['pieces'][number]['slot'] })),
    }));
  }, [profile.id]);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((looks) => !cancelled && setState({ status: 'ready', looks }))
      .catch((err: unknown) => !cancelled && setState({ status: 'error', message: authErrorMessage(err) }));
    return () => { cancelled = true; };
  }, [load]);

  async function wear(look: Look) {
    setBusy(look.id);
    setError(null);
    try {
      await wearOutfit({
        item_ids: look.pieces.map((p) => p.id), occasion: look.occasion, weather: null,
        reason: look.reason, generator_v: look.generator_v, worn_on: localToday(),
      });
      track(profile, 'outfit_worn', { occasion: look.occasion, generator_v: look.generator_v, pieces: look.pieces.length });
      setWorn((s) => new Set(s).add(look.id));
      reloadCloset();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function unsave(look: Look) {
    setBusy(look.id);
    setError(null);
    const { error: err } = await supabase.from('outfits').update({ saved: false }).eq('id', look.id);
    setBusy(null);
    if (err) return setError(authErrorMessage(err));
    setState((s) => (s.status === 'ready' ? { status: 'ready', looks: s.looks.filter((l) => l.id !== look.id) } : s));
  }

  return (
    <Screen>
      <ScreenHeader title="Saved looks" backTo="/looks" />
      {(state.status === 'loading' || closet.status === 'loading') && state.status !== 'error' && (
        <p role="status" className="mt-8 text-center font-mira text-h3 text-cocoa-soft">flipping through your looks…</p>
      )}
      {state.status === 'error' && <FormAlert message={state.message} />}
      {closet.status === 'error' && <FormAlert message={closet.message} />}
      {error && <div className="mb-3"><FormAlert message={error} /></div>}

      {state.status === 'ready' && state.looks.length === 0 && (
        <Card tone="lilac" flat className="flex flex-col items-center gap-3 p-6 text-center">
          <Mira expression="love" size="md" />
          <p className="text-body font-bold">No saved looks yet</p>
          <p className="text-caption text-cocoa-soft">Tap Save look under any outfit in the Lookbook or Today, and it’ll wait here for the right day.</p>
          <Button size="sm" onClick={() => navigate('/looks')}>Open the Lookbook</Button>
        </Card>
      )}

      {state.status === 'ready' && closet.status === 'ready' && (
        <ul className="flex flex-col gap-4">
          {state.looks.map((look) => {
            // Pieces removed from the closet drop out of the look (outfit_items cascades).
            const complete = look.pieces.length >= 2 || look.pieces.some((p) => p.slot === 'dress');
            const isWorn = worn.has(look.id);
            return (
              <li key={look.id}>
                <Card className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    {look.occasion && <span className="rounded-pill bg-lilac px-3 py-1 text-label">{OCCASION_LABEL[look.occasion]}</span>}
                    <span className="ml-auto text-caption text-cocoa-soft">saved {new Date(look.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <OutfitCollage outfit={look} items={closet.items} urls={closet.urls} />
                  {look.reason && <p className="text-caption text-cocoa-soft">{look.reason}</p>}
                  {!complete && <p className="text-caption text-cocoa-soft">Some pieces from this look have left your closet.</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <Button size="sm" variant="ghost" disabled={busy === look.id} onClick={() => void unsave(look)}>Remove</Button>
                    <Button size="sm" disabled={busy === look.id || isWorn || !complete} onClick={() => void wear(look)}>
                      {isWorn ? 'Logged ✓' : 'Wear today'}
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}
