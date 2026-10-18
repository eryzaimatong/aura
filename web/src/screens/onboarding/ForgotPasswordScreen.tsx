import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { authErrorMessage } from '../../lib/authErrors';
import { passwordResetRedirectUrl } from '../../lib/native';
import { supabase } from '../../lib/supabase';
import { FormAlert } from './FormAlert';
import { validateEmail } from './validation';

const FORM_ID = 'forgot-form';

export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = validateEmail(email);
    setFieldError(problem);
    if (problem) return;
    setSending(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: passwordResetRedirectUrl() });
    setSending(false);
    // Same message whether or not an account exists, so the screen can't be used to probe emails.
    if (err && err.status !== 400 && err.status !== 404) return setError(authErrorMessage(err));
    setSent(true);
  }

  if (sent) {
    return (
      <Screen centered footer={<Button variant="ghost" fullWidth onClick={() => navigate('/login', { replace: true })}>Back to log in</Button>}>
        <Mira expression="found-it" size="lg" />
        <h1 className="mt-6 font-display text-h2 font-semibold">Check your inbox</h1>
        <p className="mt-2 text-body text-cocoa-soft">
          If <strong className="text-cocoa">{email.trim()}</strong> has an AURA account, a reset link is on its way.
        </p>
        <p className="mt-4 font-mira text-h3 text-cocoa-soft">Can’t see it? Peek in spam.</p>
      </Screen>
    );
  }

  return (
    <Screen footer={<Button type="submit" form={FORM_ID} fullWidth disabled={sending}>{sending ? 'Sending…' : 'Send reset link'}</Button>}>
      <ScreenHeader title="Forgot password" backTo="/login" />
      <p className="text-body text-cocoa-soft">Enter your email and Mira will send you a link to choose a new password.</p>
      <form id={FORM_ID} onSubmit={(e) => void submit(e)} noValidate className="mt-6 flex flex-col gap-4">
        {error && <FormAlert message={error} />}
        <Input label="Email" type="email" autoComplete="email" placeholder="you@email.com" value={email}
          error={fieldError} onChange={(e) => setEmail(e.target.value)} />
      </form>
    </Screen>
  );
}
