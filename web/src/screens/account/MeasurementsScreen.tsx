import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import {
  bodyShape, CM_PER_IN, parseLength, RANGE_CM, SHAPE_NAMES, SHAPE_STYLE, type Measurements,
} from '../../lib/bodyShape';
import { supabase } from '../../lib/supabase';
import { FormAlert } from '../onboarding/FormAlert';

const FIELDS: ReadonlyArray<{ key: keyof Measurements; label: string; hint: string }> = [
  { key: 'shoulders_cm', label: 'Shoulders', hint: 'widest point, across the front' },
  { key: 'bust_cm', label: 'Bust', hint: 'fullest point, all the way around' },
  { key: 'waist_cm', label: 'Waist', hint: 'narrowest point' },
  { key: 'hips_cm', label: 'Hips', hint: 'fullest point' },
  { key: 'height_cm', label: 'Height', hint: 'without shoes' },
];
const FORM_ID = 'measure-form';

type Texts = Record<keyof Measurements, string>;
const EMPTY: Texts = { shoulders_cm: '', bust_cm: '', waist_cm: '', hips_cm: '', height_cm: '' };

export function MeasurementsScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const inches = profile.units === 'in';
  const unit = inches ? 'in' : 'cm';
  const [texts, setTexts] = useState<Texts>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Measurements, string>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stored in cm; shown in the user's unit.
  const toCm = (n: number) => (inches ? n * CM_PER_IN : n);
  const fromCm = (n: number) => (inches ? n / CM_PER_IN : n);

  useEffect(() => {
    supabase.from('measurements').select('*').eq('user_id', profile.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setTexts(Object.fromEntries(FIELDS.map(({ key }) => {
        const v = data[key];
        return [key, v == null ? '' : String(Math.round(fromCm(v) * 10) / 10)];
      })) as Texts);
    });
  }, [profile.id, inches]);

  const valueCm = (key: keyof Measurements): number | null => {
    const n = parseLength(texts[key]);
    return n === null || Number.isNaN(n) ? null : Math.round(toCm(n) * 10) / 10;
  };
  const cm: Measurements = {
    shoulders_cm: valueCm('shoulders_cm'), bust_cm: valueCm('bust_cm'), waist_cm: valueCm('waist_cm'),
    hips_cm: valueCm('hips_cm'), height_cm: valueCm('height_cm'),
  };
  const shape = bodyShape(cm);

  async function save(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    for (const { key, label } of FIELDS) {
      const n = parseLength(texts[key]);
      if (n === null) continue;
      const [lo, hi] = RANGE_CM[key];
      if (Number.isNaN(n) || toCm(n) < lo || toCm(n) > hi) {
        next[key] = `${label} should be between ${Math.round(fromCm(lo))} and ${Math.round(fromCm(hi))} ${unit}.`;
      }
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('measurements').upsert({ user_id: profile.id, ...cm, shape });
    setSaving(false);
    if (err) return setError(authErrorMessage(err));
    navigate('/profile', { replace: true });
  }

  return (
    <Screen
      footer={
        <>
          <Button type="submit" form={FORM_ID} fullWidth disabled={saving}>{saving ? 'Saving…' : 'Save measurements'}</Button>
          <Button variant="ghost" fullWidth onClick={() => navigate('/profile')}>Skip, I will add later</Button>
        </>
      }
    >
      <ScreenHeader title="Your measurements" backTo="/profile" />
      <Card tone="lilac" flat className="flex items-center gap-3">
        <Mira expression="wink" size="sm" />
        <div>
          <p className="font-mira text-h3 text-cocoa-soft">typed, not photographed ✦</p>
          <p className="text-caption text-cocoa-soft">A tape measure beats a photo here. Only these numbers are saved — never a weight.</p>
        </div>
      </Card>

      <form id={FORM_ID} onSubmit={(e) => void save(e)} noValidate className="mt-4 flex flex-col gap-4">
        {FIELDS.map(({ key, label, hint }) => (
          <Input key={key} label={`${label} (${unit})`} hint={hint} inputMode="decimal" placeholder={unit}
            value={texts[key]} error={errors[key]} onChange={(e) => setTexts((t) => ({ ...t, [key]: e.target.value }))} />
        ))}
      </form>

      {shape && (
        <Card tone="sand" flat className="mt-4" aria-live="polite">
          <p className="text-body font-bold">Your shape reads as: {SHAPE_NAMES[shape]}</p>
          <p className="mt-1 text-caption text-cocoa-soft">{SHAPE_STYLE[shape]}</p>
        </Card>
      )}
      {error && <div className="mt-4"><FormAlert message={error} /></div>}
    </Screen>
  );
}
