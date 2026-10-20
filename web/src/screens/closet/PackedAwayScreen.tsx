import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import { listItems, setArchived, signedUrls, type ClosetItem } from '../../lib/closet/data';
import { wornLabel } from '../../lib/closet/labels';
import { FormAlert } from '../onboarding/FormAlert';
import { ItemPhoto } from './ItemPhoto';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; items: ClosetItem[]; urls: Map<string, string> };

/** Pieces put away for now: out of outfits and closet counts, history kept, one tap to bring back. */
export function PackedAwayScreen() {
  const profile = useProfile();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const items = await listItems(profile.id, { archived: true });
      const urls = await signedUrls(items.map((i) => i.image_path));
      if (!cancelled) setState({ status: 'ready', items, urls });
    })().catch((err: unknown) => !cancelled && setState({ status: 'error', message: authErrorMessage(err) }));
    return () => { cancelled = true; };
  }, [profile.id]);

  async function bringBack(item: ClosetItem) {
    setBusy(item.id);
    setError(null);
    try {
      await setArchived(item.id, false);
      setState((s) => (s.status === 'ready' ? { ...s, items: s.items.filter((i) => i.id !== item.id) } : s));
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Packed away" backTo="/closet" />
      {state.status === 'loading' && <p role="status" className="mt-8 text-center font-mira text-h3 text-cocoa-soft">checking the storage box…</p>}
      {state.status === 'error' && <FormAlert message={state.message} />}
      {error && <div className="mb-3"><FormAlert message={error} /></div>}
      {state.status === 'ready' && state.items.length === 0 && (
        <Card tone="sand" flat className="flex flex-col items-center gap-3 p-6 text-center">
          <Mira expression="sleepy" size="md" />
          <p className="text-body font-bold">Nothing packed away</p>
          <p className="text-caption text-cocoa-soft">Out of season, lent out or ready to donate? Open a piece and tap Pack away. It keeps its history.</p>
        </Card>
      )}
      {state.status === 'ready' && state.items.length > 0 && (
        <ul className="grid grid-cols-2 gap-4">
          {state.items.map((item) => (
            <li key={item.id} className="flex flex-col rounded-lg bg-paper p-3 shadow-soft">
              <ItemPhoto src={state.urls.get(item.image_path)} alt={item.name} className="aspect-square" />
              <p className="mt-2 line-clamp-2 text-label font-bold">{item.name}</p>
              <p className="text-micro text-cocoa-soft">{wornLabel(item.wearCount)}</p>
              <Button size="sm" variant="outline" className="mt-2" disabled={busy === item.id} onClick={() => void bringBack(item)}>
                {busy === item.id ? 'Bringing back…' : 'Bring back'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
