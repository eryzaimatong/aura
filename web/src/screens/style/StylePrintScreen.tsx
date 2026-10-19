import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useProfile } from '../../lib/auth/context';
import { pct } from '../../lib/seasons';
import { AXES, printLabel, type Axes } from '../../lib/stylePrint';
import { supabase } from '../../lib/supabase';
import { SplashScreen } from '../SplashScreen';

type State = { status: 'loading' } | { status: 'none' } | { status: 'ready'; axes: Axes; confidence: number; signals: number };

export function StylePrintScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    supabase.from('style_prints').select('axes, confidence, n_signals').eq('user_id', profile.id).maybeSingle()
      .then(({ data }) => setState(data
        ? { status: 'ready', axes: data.axes as Axes, confidence: data.confidence, signals: data.n_signals }
        : { status: 'none' }));
  }, [profile.id]);

  if (state.status === 'loading') return <SplashScreen />;
  if (state.status === 'none') return <Navigate to="/profile/style/quiz" replace />;
  const { label, blurb } = printLabel(state.axes);

  return (
    <Screen footer={<Button fullWidth onClick={() => navigate('/profile/style/quiz')}>Retake the quiz</Button>}>
      <ScreenHeader title="Your Style Print" backTo="/profile" />
      <Card tone="lilac" emphasis className="p-6">
        <p className="text-micro font-bold uppercase tracking-wide text-gold-deep">Style Print</p>
        <h2 className="mt-2 font-display text-h1 font-semibold">{label}</h2>
        <p className="mt-2 text-label text-cocoa-soft">{blurb}</p>
      </Card>

      <ul className="mt-4 flex flex-col gap-3">
        {AXES.map(({ key, left, right }) => {
          const v = state.axes[key] ?? 0.5;
          return (
            <li key={key}>
              <Card>
                <div className="flex justify-between text-label">
                  <span className={v < 0.5 ? 'font-bold' : 'text-cocoa-soft'}>{left}</span>
                  <span className={v >= 0.5 ? 'font-bold' : 'text-cocoa-soft'}>{right}</span>
                </div>
                <div className="relative mt-2 h-2 w-full rounded-pill bg-track"
                  role="meter" aria-label={`${left} to ${right}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}
                  aria-valuetext={`${Math.round((v < 0.5 ? 1 - v : v) * 100)}% ${v < 0.5 ? left : right}`}>
                  <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-paper bg-lilac shadow-soft"
                    style={{ left: `${v * 100}%` }} />
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <Card tone="sand" flat className="mt-4">
        <p className="text-body font-bold">Confidence {pct(state.confidence)}</p>
        <p className="mt-1 text-caption text-cocoa-soft">
          Based on your {state.signals} quiz answers, so it’s a first sketch. Retake the quiz any time your style shifts.
        </p>
      </Card>
    </Screen>
  );
}
