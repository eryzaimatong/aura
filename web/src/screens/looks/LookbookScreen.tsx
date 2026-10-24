import { useState } from 'react';
import { X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { RoomNav } from '../../components/RoomNav';
import { Screen } from '../../components/Screen';
import type { Occasion } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiErrors';
import { FormAlert } from '../onboarding/FormAlert';
import { useCloset } from '../closet/useCloset';
import { ItemPhoto } from '../closet/ItemPhoto';
import { OutfitPanel } from './OutfitPanel';
import { SaveLookButton } from './SaveLookButton';
import { useOutfit } from './useOutfit';
import { WearStatus } from './WearStatus';

const OCCASIONS: ReadonlyArray<{ value: Occasion; label: string }> = [
  { value: 'class', label: 'Class' },
  { value: 'casual', label: 'Casual' },
  { value: 'work', label: 'Work' },
  { value: 'date', label: 'Date' },
  { value: 'formal', label: 'Formal' },
  { value: 'travel', label: 'Travel' },
];

/** Outfits for an occasion, from the user's own closet. `?item=<id>` builds every look around that piece. */
export function LookbookScreen() {
  const [params, setParams] = useSearchParams();
  const requireId = params.get('item');
  const [occasion, setOccasion] = useState<Occasion | null>(requireId ? null : 'class');
  const { state: closet, reload } = useCloset();
  const { state: outfit, shuffle, wear, save } = useOutfit(occasion, null, { requireId });
  const around = requireId && closet.status === 'ready' ? closet.items.find((i) => i.id === requireId) : undefined;
  const [worn, setWorn] = useState<'idle' | 'saving' | 'done' | { error: string }>('idle');

  async function wearToday() {
    setWorn('saving');
    try {
      await wear();
      setWorn('done');
      reload();
    } catch (err) {
      setWorn({ error: apiErrorMessage(err) });
    }
  }

  return (
    <Screen className="pb-32">
      <header>
        <h1 className="font-display text-h1 font-semibold">The Lookbook</h1>
        <nav aria-label="More looks" className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <Link to="/today" className="text-label font-bold text-cocoa underline">Today’s pick</Link>
          <Link to="/looks/week" className="text-label font-bold text-cocoa underline">My week</Link>
          <Link to="/looks/saved" className="text-label font-bold text-cocoa underline">Saved looks</Link>
          <Link to="/trips" className="text-label font-bold text-cocoa underline">Trips</Link>
        </nav>
      </header>
      {around && closet.status === 'ready' && (
        <div className="mt-4 flex items-center gap-3 rounded-md bg-tint-peach p-3">
          <ItemPhoto src={closet.urls.get(around.image_path)} alt="" className="size-14 shrink-0" />
          <p className="min-w-0 flex-1 text-label">Looks built around your <span className="font-bold">{around.name.toLowerCase()}</span></p>
          <button type="button" aria-label="Stop building around this piece" onClick={() => { setWorn('idle'); setParams({}); setOccasion((o) => o ?? 'class'); }}
            className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="-mx-gutter mt-4 flex gap-2 overflow-x-auto px-gutter pb-1">
        {requireId && <Chip selected={occasion === null} onClick={() => { setWorn('idle'); setOccasion(null); }}>Any</Chip>}
        {OCCASIONS.map((o) => (
          <Chip key={o.value} selected={occasion === o.value} onClick={() => { setWorn('idle'); setOccasion(o.value); }}>
            {o.label}
          </Chip>
        ))}
      </div>

      <div className="mt-4">
        <OutfitPanel outfit={outfit} closet={closet} whyTitle="Why this works" onRetry={shuffle} />
      </div>

      {outfit.status === 'ready' && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="outline" disabled={worn === 'saving'} onClick={() => { setWorn('idle'); shuffle(); }}>Shuffle</Button>
          <Button disabled={worn === 'saving' || worn === 'done'} onClick={() => void wearToday()}>
            {worn === 'done' ? 'Logged ✓' : 'Wear today'}
          </Button>
        </div>
      )}
      {outfit.status === 'ready' && <SaveLookButton save={save} outfitKey={outfit.outfit.pieces.map((p) => p.id).join()} />}
      <WearStatus worn={worn} />
      {typeof worn === 'object' && <div className="mt-3"><FormAlert message={worn.error} /></div>}
      <RoomNav active="looks" />
    </Screen>
  );
}
