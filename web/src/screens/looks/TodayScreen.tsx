import { useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Mira } from '../../components/Mira';
import { RoomNav } from '../../components/RoomNav';
import { Screen } from '../../components/Screen';
import { apiErrorMessage } from '../../lib/apiErrors';
import { FormAlert } from '../onboarding/FormAlert';
import { useCloset } from '../closet/useCloset';
import { OutfitPanel } from './OutfitPanel';
import { SaveLookButton } from './SaveLookButton';
import { useOutfit } from './useOutfit';
import { useWeather } from './useWeather';
import { WeatherCard } from './WeatherCard';
import { WearStatus } from './WearStatus';

/** Weather-aware outfit of the day. */
export function TodayScreen() {
  const { state: closet, reload } = useCloset();
  const weather = useWeather();
  const w = weather.state.status === 'loading' ? undefined : weather.state.status === 'ready' ? weather.state.weather : null;
  const { state: outfit, shuffle, wear, save } = useOutfit(null, w);
  const [worn, setWorn] = useState<'idle' | 'saving' | 'done' | { error: string }>('idle');

  async function wearing() {
    setWorn('saving');
    try {
      await wear();
      setWorn('done');
      reload();
    } catch (err) {
      setWorn({ error: apiErrorMessage(err) });
    }
  }

  const ready = outfit.status === 'ready';
  return (
    <Screen className="pb-32">
      <WeatherCard state={weather.state} usingDefault={weather.usingDefault} onUseLocation={weather.useMyLocation} locError={weather.locError} />
      <h1 className="mt-6 font-display text-h1 font-semibold">What to wear today</h1>

      <div className="mt-4">
        <OutfitPanel outfit={outfit} closet={closet} whyTitle="Why today" onRetry={shuffle} />
      </div>

      {ready && outfit.outfit.tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Why it fits today">
          {outfit.outfit.tags.map((t, i) => (
            <li key={t} className={i === 0 ? 'rounded-pill bg-lilac px-4 py-2 text-label' : 'rounded-pill border-2 border-track bg-paper px-4 py-2 text-label'}>{t}</li>
          ))}
        </ul>
      )}

      {ready && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="outline" disabled={worn === 'saving'} onClick={() => { setWorn('idle'); shuffle(); }}>Show another</Button>
          <Button disabled={worn === 'saving' || worn === 'done'} onClick={() => void wearing()}>
            {worn === 'done' ? 'Logged ✓' : 'Wearing this'}
          </Button>
        </div>
      )}
      {ready && <SaveLookButton save={save} outfitKey={outfit.outfit.pieces.map((p) => p.id).join()} />}
      <WearStatus worn={worn} />
      {typeof worn === 'object' && <div className="mt-3"><FormAlert message={worn.error} /></div>}

      {ready && outfit.outfit.note && (
        <Card tone="lilac" flat className="mt-4 flex items-center gap-3">
          <Mira expression="found-it" size="sm" />
          <div>
            <p className="font-mira text-h3 text-cocoa-soft">{outfit.outfit.note.split(':')[0]} ✦</p>
            <p className="text-caption text-cocoa-soft">{outfit.outfit.note.split(':').slice(1).join(':').trim()}</p>
          </div>
        </Card>
      )}
      <RoomNav active="looks" />
    </Screen>
  );
}
