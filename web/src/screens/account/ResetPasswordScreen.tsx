import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import { supabase } from '../../lib/supabase';
import { FormAlert } from '../onboarding/FormAlert';
import { validatePassword } from '../onboarding/validation';
import { SplashScreen } from '../SplashScreen';

const FORM_ID = 'reset-form';

/**
 * Choose a new password. Reached from a reset email (the link signs the user in first)
 * or from Settings → Password.
 */
export function ResetPasswordScreen() {
  const navigate = useNavigate();
  const { state } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (state.status === 'loading') return <SplashScreen />;
  if (state.status === 'signed_out') {
    return (
      <Screen centered footer={<Button fullWidth onClick={() => navigate('/forgot', { replace: true })}>Send a new link</Button>}>
        <Mira expression="worried" size="lg" />
        <h1 className="mt-6 font-display text-h2 font-semibold">This link has expired</h1>
        <p className="mt-2 text-body text-cocoa-soft">Reset links work once and only for a short while. Ask for a fresh one.</p>
      </Screen>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = {
      password: validatePassword(password),
      confirm: password === confirm ? undefined : 'The two passwords don’t match.',
    };
    setErrors(next);
    if (next.password || next.confirm) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) return setError(authErrorMessage(err));
    navigate('/', { replace: true });
  }

  return (
    <Screen footer={<Button type="submit" form={FORM_ID} fullWidth disabled={saving}>{saving ? 'Saving…' : 'Save new password'}</Button>}>
      <ScreenHeader title="New password" backTo="/" />
      <form id={FORM_ID} onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
        {error && <FormAlert message={error} />}
        <Input label="New password" type="password" autoComplete="new-password" hint="At least 8 characters."
          value={password} error={errors.password} onChange={(e) => setPassword(e.target.value)} />
        <Input label="Type it again" type="password" autoComplete="new-password"
          value={confirm} error={errors.confirm} onChange={(e) => setConfirm(e.target.value)} />
      </form>
    </Screen>
  );
}
