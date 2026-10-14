import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ApiError, postUndertoneQuiz, type UndertoneAnswers } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiErrors';
import { FormAlert } from '../onboarding/FormAlert';

type Question<K extends keyof UndertoneAnswers> = {
  key: K;
  prompt: string;
  options: ReadonlyArray<{ value: UndertoneAnswers[K]; label: string }>;
};

const QUESTIONS = [
  { key: 'veins', prompt: 'Your veins look…', options: [
    { value: 'blue', label: 'Blue or purple' }, { value: 'green', label: 'Green' }, { value: 'unsure', label: 'Hard to tell' },
  ] } satisfies Question<'veins'>,
  { key: 'metal', prompt: 'Which jewellery suits you?', options: [
    { value: 'silver', label: 'Silver' }, { value: 'gold', label: 'Gold' }, { value: 'both', label: 'Both equally' },
  ] } satisfies Question<'metal'>,
  { key: 'sun', prompt: 'In the sun you…', options: [
    { value: 'burn', label: 'Burn, rarely tan' }, { value: 'tan', label: 'Tan easily' }, { value: 'burn_then_tan', label: 'Burn then tan' },
  ] } satisfies Question<'sun'>,
] as const;

/** Fallback when the light was too tricky to read undertone (hard rule 10). */
export function UndertoneQuizScreen() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Partial<UndertoneAnswers>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = (a: Partial<UndertoneAnswers>): a is UndertoneAnswers => !!(a.veins && a.metal && a.sun);

  async function finish() {
    if (!complete(answers)) return;
    setSaving(true);
    setError(null);
    try {
      await postUndertoneQuiz(answers);
      navigate('/mirror/card', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'no_card') return navigate('/mirror/scan', { replace: true });
      setError(apiErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          <Button fullWidth disabled={!complete(answers) || saving} onClick={() => void finish()}>
            {saving ? 'Finishing…' : 'Finish my palette'}
          </Button>
          <Button variant="ghost" fullWidth onClick={() => navigate('/mirror/scan', { replace: true })}>
            Retake the photo instead
          </Button>
        </>
      }
    >
      <ScreenHeader title="Quick undertone check" backTo="/" />

      <Card tone="lilac" flat className="flex items-center gap-3">
        <Mira expression="thinking" size="sm" />
        <div>
          <p className="font-mira text-h3 text-cocoa-soft">the light was tricky ✦</p>
          <p className="text-caption text-cocoa-soft">Three questions get me close enough to finish your palette.</p>
        </div>
      </Card>

      <div className="mt-4 flex flex-col gap-3">
        {QUESTIONS.map((q) => (
          <Card key={q.key} role="group" aria-label={q.prompt}>
            <p className="text-label font-bold">{q.prompt}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {q.options.map((o) => (
                <Chip
                  key={o.value}
                  selected={answers[q.key] === o.value}
                  onClick={() => setAnswers((a) => ({ ...a, [q.key]: o.value }))}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          </Card>
        ))}
      </div>
      {error && (
        <div className="mt-4">
          <FormAlert message={error} />
        </div>
      )}
    </Screen>
  );
}
