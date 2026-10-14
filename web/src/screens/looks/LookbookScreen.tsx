import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { RoomNav } from '../../components/RoomNav';
import { Screen } from '../../components/Screen';
import type { Occasion } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiErrors';
import { FormAlert } from '../onboarding/FormAlert';
import { useCloset } from '../closet/useCloset';
import { OutfitPanel } from './OutfitPanel';
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

/** Outfits for an occasion, from the user's own closet. */
export function LookbookScreen() {
  const [occasion, setOccasion] = useState<Occasion>('class');
  const { state: closet, reload } = useCloset();
  const { state: outfit, shuffle, wear } = useOutfit(occasion, null);
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
      <header className="flex items-end justify-between">
        <h1 className="font-display text-h1 font-semibold">The Lookbook</h1>
        <Link to="/today" className="text-label font-bold text-gold-deep underline">Today’s pick</Link>
      </header>
      <div className="-mx-gutter mt-4 flex gap-2 overflow-x-auto px-gutter pb-1">
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
      <WearStatus worn={worn} />
      {typeof worn === 'object' && <div className="mt-3"><FormAlert message={worn.error} /></div>}
      <RoomNav active="looks" />
    </Screen>
  );
}
