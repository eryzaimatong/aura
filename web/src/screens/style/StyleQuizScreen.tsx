import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Flower2, Footprints, Gem, Layers, Shirt, Sparkles, Square, Sun, TrendingUp, Zap } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import { cx } from '../../lib/cx';
import { computeAxes, printLabel, printVector, QUESTIONS, QUIZ_CONFIDENCE, type Choice } from '../../lib/stylePrint';
import { supabase } from '../../lib/supabase';
import { FormAlert } from '../onboarding/FormAlert';

const ICONS: Record<Choice['icon'], LucideIcon> = {
  flower: Flower2, square: Square, zap: Zap, layers: Layers, shirt: Shirt,
  sparkles: Sparkles, gem: Gem, footprints: Footprints, trending: TrendingUp, sun: Sun,
};
const TINTS = ['bg-tint-pink', 'bg-tint-sage', 'bg-tint-peach', 'bg-tint-blue'];

export function StyleQuizScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const [answers, setAnswers] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = QUESTIONS[step]!;
  const chosen = answers[step];
  const last = step === QUESTIONS.length - 1;
  const pct = Math.round((step / QUESTIONS.length) * 100);

  async function finish(all: number[]) {
    setSaving(true);
    setError(null);
    const axes = computeAxes(all);
    const { label } = printLabel(axes);
    const { error: err } = await supabase.from('style_prints').upsert({
      user_id: profile.id, vector: `[${printVector(all, axes).join(',')}]`, axes, label,
      confidence: QUIZ_CONFIDENCE, quiz_answers: all, n_signals: all.length,
    });
    setSaving(false);
    if (err) return setError(authErrorMessage(err));
    navigate('/profile/style', { replace: true });
  }

  function next() {
    if (chosen === undefined) return;
    if (last) void finish(answers);
    else setStep((s) => s + 1);
  }

  return (
    <Screen footer={<Button fullWidth disabled={chosen === undefined || saving} onClick={next}>
      {saving ? 'Saving…' : last ? 'See my Style Print' : 'Next question'}
    </Button>}>
      <ScreenHeader title="Style Print" backTo="/profile" />
      <div className="flex justify-between text-label">
        <span className="text-cocoa-soft">Question {step + 1} of {QUESTIONS.length}</span>
        <span className="font-bold text-cocoa">{pct}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="h-full rounded-pill bg-gold transition-[width]" style={{ width: `${pct}%` }} />
      </div>

      <h2 className="mt-4 font-display text-h2 font-semibold">{q.prompt}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label={q.prompt}>
        {q.choices.map((c, i) => {
          const Icon = ICONS[c.icon];
          const on = chosen === i;
          return (
            <button key={c.label} type="button" role="radio" aria-checked={on}
              onClick={() => setAnswers((a) => { const n = [...a]; n[step] = i; return n.slice(0, step + 1); })}
              className={cx('flex flex-col gap-2 rounded-md border-2 bg-paper p-3 text-left transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep',
                on ? 'border-gold-deep' : 'border-track')}>
              <span className={cx('flex aspect-[4/3] items-center justify-center rounded-sm text-cocoa-soft', TINTS[i])}>
                <Icon aria-hidden="true" size={32} />
              </span>
              <span className="text-label">{c.label}</span>
            </button>
          );
        })}
      </div>

      {step > 0 && (
        <button type="button" onClick={() => setStep((s) => s - 1)} className="mt-3 self-start text-label font-bold text-cocoa underline">
          Previous question
        </button>
      )}
      <Card tone="sand" flat className="mt-4">
        <p className="text-caption text-cocoa-soft">Your answers seed your Style Print. You can retake the quiz any time.</p>
      </Card>
      {error && <div className="mt-4"><FormAlert message={error} /></div>}
    </Screen>
  );
}
