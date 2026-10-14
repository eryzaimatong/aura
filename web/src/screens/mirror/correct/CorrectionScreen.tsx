import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Chip } from '../../../components/Chip';
import { Mira } from '../../../components/Mira';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { postCorrection, type CorrectionRequest } from '../../../lib/api';
import { apiErrorMessage } from '../../../lib/apiErrors';
import type { AuraCardRow } from '../../../lib/database.types';
import {
  ALL_FACE_SHAPES, ALL_SEASONS, ALL_UNDERTONES, FACE_SHAPE_NAMES, NEIGHBOUR_SEASONS, pct, SEASON_NAMES, UNDERTONE_NAMES,
} from '../../../lib/seasons';
import { FormAlert } from '../../onboarding/FormAlert';
import { SplashScreen } from '../../SplashScreen';
import { useCurrentCard } from '../useCurrentCard';
import { ChoiceCard } from './ChoiceCard';

type Topic = 'season' | 'face_shape' | 'undertone' | 'everything';
const TOPICS: ReadonlyArray<{ value: Topic; label: string }> = [
  { value: 'season', label: 'The season' },
  { value: 'face_shape', label: 'The face shape' },
  { value: 'undertone', label: 'The undertone' },
  { value: 'everything', label: 'Everything' },
];

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function CorrectionScreen() {
  const { state } = useCurrentCard();
  if (state.status === 'loading') return <SplashScreen />;
  if (state.status === 'none') return <Navigate to="/mirror/scan" replace />;
  if (state.status === 'error') return <Navigate to="/mirror/card" replace />;
  return <CorrectionForm card={state.card} />;
}

function CorrectionForm({ card }: { card: AuraCardRow }) {
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [answers, setAnswers] = useState<CorrectionRequest>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const asks = (t: Exclude<Topic, 'everything'>) => topic === t || topic === 'everything';
  const needed = (['season', 'face_shape', 'undertone'] as const).filter(asks);
  const complete = needed.length > 0 && needed.every((k) => answers[k] !== undefined);

  const seasonChoices = (card.season ? NEIGHBOUR_SEASONS[card.season] : ALL_SEASONS).map((s) => ({ value: s, label: SEASON_NAMES[s] }));
  const otherSeasons = ALL_SEASONS.filter((s) => s !== card.season).map((s) => ({ value: s, label: SEASON_NAMES[s] }));

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await postCorrection(Object.fromEntries(needed.map((k) => [k, answers[k]])) as CorrectionRequest);
      navigate('/mirror/card', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          <Button fullWidth disabled={!complete || saving} onClick={() => void submit()}>
            {saving ? 'Updating…' : 'Update my card'}
          </Button>
          <Button variant="ghost" fullWidth onClick={() => navigate('/mirror/scan', { replace: true })}>
            Retake the scan instead
          </Button>
        </>
      }
    >
      <ScreenHeader title="Tell Mira what is off" backTo="/mirror/card" />

      <Card tone="lilac" flat>
        <p className="text-micro font-bold uppercase tracking-wide text-gold-deep">I said</p>
        <p className="mt-1 font-display text-h3 font-semibold">
          {card.season ? SEASON_NAMES[card.season] : 'No season yet'} · {FACE_SHAPE_NAMES[card.face_shape].toLowerCase()} face
        </p>
        <p className="mt-1 text-caption text-cocoa-soft">
          Color confidence {pct(card.season_conf)} · shape {pct(card.shape_conf)}
        </p>
      </Card>

      <p className="mt-6 text-label font-bold">What feels wrong?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <Chip key={t.value} selected={topic === t.value} onClick={() => setTopic(t.value)}>
            {t.label}
          </Chip>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {asks('season') && (
          <ChoiceCard question="Which season feels more like you?" choices={seasonChoices} more={card.season ? otherSeasons : undefined}
            value={answers.season} onChange={(v) => setAnswers((a) => ({ ...a, season: v }))} />
        )}
        {asks('face_shape') && (
          <ChoiceCard question="Which face shape feels closer?"
            choices={ALL_FACE_SHAPES.filter((s) => s !== card.face_shape).map((s) => ({ value: s, label: FACE_SHAPE_NAMES[s] }))}
            value={answers.face_shape} onChange={(v) => setAnswers((a) => ({ ...a, face_shape: v }))} />
        )}
        {asks('undertone') && (
          <ChoiceCard question="Which undertone sounds like you?"
            choices={ALL_UNDERTONES.filter((u) => u !== card.skin_undertone).map((u) => ({ value: u, label: capital(UNDERTONE_NAMES[u]) }))}
            value={answers.undertone} onChange={(v) => setAnswers((a) => ({ ...a, undertone: v }))} />
        )}
      </div>

      {topic && (
        <Card tone="lilac" flat className="mt-4 flex items-center gap-3">
          <Mira expression="love" size="sm" />
          <div>
            <p className="font-mira text-h3 text-cocoa-soft">thank you, really ✦</p>
            <p className="text-caption text-cocoa-soft">Corrections like yours make the model better. Your palette updates right away.</p>
          </div>
        </Card>
      )}
      {error && (
        <div className="mt-4">
          <FormAlert message={error} />
        </div>
      )}
    </Screen>
  );
}
