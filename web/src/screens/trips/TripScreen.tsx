import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { authErrorMessage } from '../../lib/authErrors';
import type { TripRow } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { saveTicks } from '../../lib/trips';
import { FormAlert } from '../onboarding/FormAlert';
import { useCloset } from '../closet/useCloset';
import { TripView } from './TripView';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; trip: TripRow };

export function TripScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { state: closet } = useCloset();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.from('trips').select('*').eq('id', id).maybeSingle().then(({ data, error }) =>
      setState(error ? { status: 'error', message: authErrorMessage(error) }
        : data ? { status: 'ready', trip: data } : { status: 'error', message: 'This trip isn’t here any more.' }));
  }, [id]);

  async function remove() {
    setDeleting(true);
    const { error } = await supabase.from('trips').delete().eq('id', id);
    setDeleting(false);
    if (error) return setState({ status: 'error', message: authErrorMessage(error) });
    saveTicks(id, new Set());
    navigate('/trips', { replace: true });
  }

  const trip = state.status === 'ready' ? state.trip : null;
  return (
    <Screen footer={trip && (confirming ? (
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" disabled={deleting} onClick={() => setConfirming(false)}>Keep it</Button>
        <Button disabled={deleting} onClick={() => void remove()}>{deleting ? 'Deleting…' : 'Delete trip'}</Button>
      </div>
    ) : <Button fullWidth variant="ghost" onClick={() => setConfirming(true)}>Delete this trip</Button>)}>
      <ScreenHeader title="Trip" backTo="/trips" />
      {state.status === 'error' && <FormAlert message={state.message} />}
      {closet.status === 'error' && <FormAlert message={closet.message} />}
      {(state.status === 'loading' || closet.status === 'loading') && state.status !== 'error' && (
        <p role="status" className="mt-8 text-center font-mira text-h3 text-cocoa-soft">unpacking…</p>
      )}
      {trip && closet.status === 'ready' && (
        <TripView tripId={trip.id} items={closet.items} urls={closet.urls} trip={{
          place: trip.place, starts_on: trip.starts_on, ends_on: trip.ends_on, item_ids: trip.item_ids, gaps: trip.gaps,
          plan: trip.forecast ?? { days: [], looks: [], layer_note: null, generator_v: '' },
        }} />
      )}
    </Screen>
  );
}
