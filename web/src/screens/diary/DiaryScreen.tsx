import { Sparkles } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Mira } from '../../components/Mira';
import { RoomNav } from '../../components/RoomNav';
import { Screen } from '../../components/Screen';
import { insight, streak, topColours, utilisation, weeklyWears } from '../../lib/diary';
import { FormAlert } from '../onboarding/FormAlert';
import { useCloset } from '../closet/useCloset';
import { ColourBars, WeekBars } from './DiaryCharts';

export function DiaryScreen() {
  const { state, reload } = useCloset();
  const now = new Date();
  const [year, month] = [now.getFullYear(), now.getMonth()];

  return (
    <Screen className="pb-32">
      <header className="flex items-end justify-between">
        <h1 className="font-display text-h1 font-semibold">The Diary</h1>
        <span className="text-label text-cocoa-soft">{now.toLocaleDateString('en-PH', { month: 'long' })}</span>
      </header>

      {state.status === 'loading' && <p role="status" className="mt-10 text-center font-mira text-h3 text-cocoa-soft">turning the pages…</p>}
      {state.status === 'error' && (
        <div className="mt-6 flex flex-col gap-3">
          <FormAlert message={state.message} />
          <Button variant="ghost" onClick={reload}>Try again</Button>
        </div>
      )}

      {state.status === 'ready' && (() => {
        const days = streak(state.log, now);
        const use = utilisation(state.items);
        return (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-md bg-gold p-5 shadow-soft">
              <div>
                <p className="font-display text-h2 font-semibold">{days > 0 ? `${days} day streak` : 'Start a streak today'}</p>
                <p className="text-caption text-cocoa">{days > 0 ? 'logged what you wore' : 'log what you wear to begin'}</p>
              </div>
              <Sparkles aria-hidden="true" className="size-8 text-paper" />
            </div>

            <dl className="grid grid-cols-3 gap-3 text-center">
              <Tile value={`${use.pctUsed}%`} label="closet used" />
              <Tile value={String(use.wornOnce)} label="worn once only" />
              <Tile value={String(use.unworn)} label="unworn" />
            </dl>

            <WeekBars weeks={weeklyWears(state.log, year, month)} />
            <ColourBars colours={topColours(state.log, state.items, year, month)} />

            <Card tone="lilac" flat className="flex items-center gap-3">
              <Mira expression="streak" size="sm" />
              <div>
                <p className="font-mira text-h3 text-cocoa-soft">what I noticed ✦</p>
                <p className="text-caption text-cocoa-soft">{insight(state.log, state.items, year, month)}</p>
              </div>
            </Card>
          </div>
        );
      })()}
      <RoomNav active="diary" />
    </Screen>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse rounded-md bg-paper p-3 shadow-soft">
      <dt className="text-micro text-cocoa-soft">{label}</dt>
      <dd className="font-display text-stat font-semibold">{value}</dd>
    </div>
  );
}
