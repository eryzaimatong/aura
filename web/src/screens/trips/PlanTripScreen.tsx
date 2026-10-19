import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Input } from '../../components/Input';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { planTrip, type TripOccasion, type TripPlan } from '../../lib/api';
import { useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import { supabase } from '../../lib/supabase';
import { addDays, daysBetween, localISO, MAX_TRIP_DAYS, toRow, TRIP_OCCASIONS, tripErrorMessage } from '../../lib/trips';
import { FormAlert } from '../onboarding/FormAlert';
import { useCloset } from '../closet/useCloset';
import { TripView } from './TripView';

export function PlanTripScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const { state: closet } = useCloset();
  const today = localISO();
  const [place, setPlace] = useState('');
  const [start, setStart] = useState(addDays(today, 1));
  const [end, setEnd] = useState(addDays(today, 3));
  const [occasions, setOccasions] = useState<Set<TripOccasion>>(new Set(['casual']));
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [busy, setBusy] = useState<'planning' | 'saving' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const length = daysBetween(start, end) + 1;
  const dateError = start < today ? 'Pick a start date from today onward.'
    : length < 1 ? 'The trip ends before it starts.'
    : length > MAX_TRIP_DAYS ? `Trips can be up to ${MAX_TRIP_DAYS} days for now.` : undefined;
  const canPlan = place.trim().length >= 2 && occasions.size > 0 && !dateError && busy === null;

  async function makePlan() {
    setError(null);
    setBusy('planning');
    try {
      setPlan(await planTrip({ place: place.trim(), starts_on: start, ends_on: end, occasions: [...occasions] }));
    } catch (err) {
      setError(tripErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!plan) return;
    setError(null);
    setBusy('saving');
    const { data, error: err } = await supabase.from('trips').insert(toRow(plan, profile.id)).select('id').single();
    setBusy(null);
    if (err) return setError(authErrorMessage(err));
    navigate(`/trips/${data.id}`, { replace: true });
  }

  function toggleOccasion(o: TripOccasion) {
    setOccasions((s) => {
      const n = new Set(s);
      if (n.has(o)) n.delete(o);
      else n.add(o);
      return n;
    });
  }

  if (plan && closet.status === 'ready') {
    return (
      <Screen footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" disabled={busy !== null} onClick={() => setPlan(null)}>Change trip</Button>
          <Button disabled={busy !== null} onClick={() => void save()}>{busy === 'saving' ? 'Saving…' : 'Save trip'}</Button>
        </div>
      }>
        <ScreenHeader title="Your trip plan" backTo="/trips" />
        {error && <div className="mb-3"><FormAlert message={error} /></div>}
        <TripView items={closet.items} urls={closet.urls} trip={{
          place: plan.place, starts_on: plan.starts_on, ends_on: plan.ends_on, item_ids: plan.packed_ids, gaps: plan.gaps,
          plan: { days: plan.forecast, looks: plan.looks, layer_note: plan.layer_note, generator_v: plan.generator_v },
        }} />
      </Screen>
    );
  }

  return (
    <Screen footer={
      <Button fullWidth disabled={!canPlan} onClick={() => void makePlan()}>{busy === 'planning' ? 'Packing…' : 'Plan my outfits'}</Button>
    }>
      <ScreenHeader title="Plan a trip" backTo="/trips" />
      <div className="flex items-center gap-3">
        <Mira expression="closet-pick" size="sm" />
        <p className="font-mira text-h3 text-cocoa-soft">tell me where and when, and I’ll pack from your closet.</p>
      </div>

      <form className="mt-6 flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); if (canPlan) void makePlan(); }}>
        <Input label="Where to?" placeholder="e.g. Baguio" maxLength={80} autoComplete="off"
          value={place} onChange={(e) => setPlace(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="From" type="date" min={today} value={start}
            onChange={(e) => { const v = e.target.value; setStart(v); if (v > end) setEnd(v); }} />
          <Input label="To" type="date" min={start} value={end} error={dateError} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <fieldset>
          <legend className="text-label text-cocoa-soft">What’s on the trip?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {TRIP_OCCASIONS.map((o) => (
              <Chip key={o.value} selected={occasions.has(o.value)} onClick={() => toggleOccasion(o.value)}>{o.label}</Chip>
            ))}
          </div>
        </fieldset>
        <p className="text-caption text-cocoa-soft">Only the place name is used, to look up the weather. Mira never sends where you are.</p>
      </form>

      {busy === 'planning' && <p role="status" className="mt-6 text-center font-mira text-h3 text-cocoa-soft">checking the forecast and your closet…</p>}
      {error && <div className="mt-4"><FormAlert message={error} /></div>}
    </Screen>
  );
}
