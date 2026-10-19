import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import type { TripRow } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { dateRange, localISO, weatherSummary } from '../../lib/trips';
import { FormAlert } from '../onboarding/FormAlert';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; trips: TripRow[] };

export function TripsScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    supabase.from('trips').select('*').eq('user_id', profile.id).order('starts_on', { ascending: false }).then(({ data, error }) =>
      setState(error ? { status: 'error', message: authErrorMessage(error) } : { status: 'ready', trips: data }));
  }, [profile.id]);

  const today = localISO();
  const trips = state.status === 'ready' ? state.trips : [];
  const upcoming = trips.filter((t) => t.ends_on >= today).reverse();
  const past = trips.filter((t) => t.ends_on < today);

  const list = (title: string, rows: TripRow[]) => rows.length > 0 && (
    <section className="mt-5">
      <h2 className="text-label font-bold text-cocoa-soft">{title}</h2>
      <ul className="mt-2 flex flex-col gap-3">
        {rows.map((t) => {
          const weather = t.forecast ? weatherSummary(t.forecast.days) : null;
          return (
            <li key={t.id}>
              <Link to={`/trips/${t.id}`} className="block rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep">
                <Card className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-bold">{t.place}</p>
                    <p className="text-caption text-cocoa-soft">
                      {dateRange(t.starts_on, t.ends_on)} · {t.item_ids.length} pieces{weather ? ` · ${weather}` : ''}
                    </p>
                  </div>
                  <ChevronRight size={20} aria-hidden="true" className="text-cocoa-soft" />
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <Screen footer={<Button fullWidth onClick={() => navigate('/trips/new')}>Plan a trip</Button>}>
      <ScreenHeader title="Trips" backTo="/looks" />
      {state.status === 'loading' && <p role="status" className="mt-8 text-center font-mira text-h3 text-cocoa-soft">opening your suitcase…</p>}
      {state.status === 'error' && <FormAlert message={state.message} />}
      {state.status === 'ready' && trips.length === 0 && (
        <Card tone="lilac" flat className="flex flex-col items-center gap-3 p-6 text-center">
          <Mira expression="closet-pick" size="md" />
          <p className="text-body font-bold">Going somewhere?</p>
          <p className="text-caption text-cocoa-soft">Tell Mira where and when, and Mira will check the forecast and pack outfits from your own closet.</p>
        </Card>
      )}
      {list('Coming up', upcoming)}
      {list('Past trips', past)}
    </Screen>
  );
}
