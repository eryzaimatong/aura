import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ApiError, planWeek, wearOutfit, type TripLook, type WeekOccasion, type WeekPlan } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiErrors';
import { track } from '../../lib/analytics';
import { useProfile } from '../../lib/auth/context';
import { localToday } from '../../lib/closet/data';
import { savedCoords } from '../../lib/location';
import { dayLabel } from '../../lib/trips';
import { FormAlert } from '../onboarding/FormAlert';
import { useCloset } from '../closet/useCloset';
import { OutfitCollage } from './OutfitCollage';
import { OutfitPanel } from './OutfitPanel';

const WEEKDAY: ReadonlyArray<{ value: WeekOccasion; label: string }> = [
  { value: 'class', label: 'Class' }, { value: 'work', label: 'Work' }, { value: 'casual', label: 'Casual' },
];
const WEEKEND: ReadonlyArray<{ value: WeekOccasion; label: string }> = [
  { value: 'casual', label: 'Casual' }, { value: 'date', label: 'Going out' }, { value: 'travel', label: 'Out and about' },
];
const PREFS = 'aura.week_prefs';

function loadPrefs(): { weekday: WeekOccasion; weekend: WeekOccasion } {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS) ?? 'null') as { weekday?: WeekOccasion; weekend?: WeekOccasion } | null;
    return { weekday: p?.weekday ?? 'class', weekend: p?.weekend ?? 'casual' };
  } catch {
    return { weekday: 'class', weekend: 'casual' };
  }
}

type State = { status: 'loading' } | { status: 'ready'; plan: WeekPlan } | { status: 'need_items'; missing: string } | { status: 'error'; message: string };

/** Seven days of outfits from today, with the week's forecast. Recomputed on open; nothing stored. */
export function WeekScreen() {
  const profile = useProfile();
  const { state: closet, reload } = useCloset();
  const [prefs, setPrefs] = useState(loadPrefs);
  const [state, setState] = useState<State>({ status: 'loading' });
  const [worn, setWorn] = useState<'idle' | 'saving' | 'done' | { error: string }>('idle');
  const today = localToday();

  useEffect(() => {
    try {
      localStorage.setItem(PREFS, JSON.stringify(prefs));
    } catch {
      /* not remembered: fine */
    }
    let cancelled = false;
    setState({ status: 'loading' });
    const coords = savedCoords();
    planWeek({ start: localToday(), ...prefs, ...(coords ?? {}) })
      .then((plan) => !cancelled && setState({ status: 'ready', plan }))
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code.startsWith('need_items:')) setState({ status: 'need_items', missing: err.code.slice(11) });
        else setState({ status: 'error', message: apiErrorMessage(err) });
      });
    return () => { cancelled = true; };
  }, [prefs]);

  async function wearToday(look: TripLook, generatorV: string) {
    setWorn('saving');
    try {
      await wearOutfit({ item_ids: look.pieces.map((p) => p.id), occasion: look.occasion, weather: null,
        reason: look.reason, generator_v: generatorV, worn_on: today });
      track(profile, 'outfit_worn', { occasion: look.occasion, generator_v: generatorV, pieces: look.pieces.length, source: 'week' });
      setWorn('done');
      reload();
    } catch (err) {
      setWorn({ error: apiErrorMessage(err) });
    }
  }

  const plan = state.status === 'ready' ? state.plan : null;
  return (
    <Screen>
      <ScreenHeader title="Your week" backTo="/looks" />
      <fieldset>
        <legend className="text-label font-bold">Weekdays</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {WEEKDAY.map((o) => <Chip key={o.value} selected={prefs.weekday === o.value} onClick={() => setPrefs((p) => ({ ...p, weekday: o.value }))}>{o.label}</Chip>)}
        </div>
      </fieldset>
      <fieldset className="mt-3">
        <legend className="text-label font-bold">Weekend</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {WEEKEND.map((o) => <Chip key={o.value} selected={prefs.weekend === o.value} onClick={() => setPrefs((p) => ({ ...p, weekend: o.value }))}>{o.label}</Chip>)}
        </div>
      </fieldset>

      <div className="mt-5">
        {state.status !== 'ready' && (
          <OutfitPanel outfit={state.status === 'loading' ? { status: 'loading' } : state} closet={closet} whyTitle="" onRetry={() => setPrefs((p) => ({ ...p }))} />
        )}
      </div>

      {plan && closet.status === 'ready' && (
        <>
          <p className="text-caption text-cocoa-soft">
            {plan.forecast.length > 0 ? `Weather for ${plan.place ?? 'your area'}, from Open-Meteo.` : 'The forecast isn’t available right now, so this week is planned without weather.'}
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {plan.looks.map((look) => {
              const day = plan.forecast.find((d) => d.date === look.date);
              const isToday = look.date === today;
              return (
                <li key={look.date}>
                  <Card emphasis={isToday} className="flex flex-col gap-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-label font-bold">{isToday ? 'Today' : look.date ? dayLabel(look.date) : look.label}</p>
                      {day && <p className="text-caption text-cocoa-soft">{Math.round(day.min_c)}–{Math.round(day.max_c)}°C{day.rain_pct >= 60 ? ' · rain likely' : ''}</p>}
                    </div>
                    <OutfitCollage outfit={look} items={closet.items} urls={closet.urls} />
                    <p className="text-caption text-cocoa-soft">{look.reason}</p>
                    {isToday && (
                      <Button size="sm" disabled={worn === 'saving' || worn === 'done'} onClick={() => void wearToday(look, plan.generator_v)}>
                        {worn === 'done' ? 'Logged ✓' : 'Wearing this today'}
                      </Button>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
          {typeof worn === 'object' && <div className="mt-3"><FormAlert message={worn.error} /></div>}
          <p className="mt-4 text-caption text-cocoa-soft">Plans refresh each time you open this page, so new pieces and fresh forecasts are always included.</p>
        </>
      )}
    </Screen>
  );
}
