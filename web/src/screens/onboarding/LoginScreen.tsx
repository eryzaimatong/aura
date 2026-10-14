import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { authErrorMessage } from '../../lib/authErrors';
import { supabase } from '../../lib/supabase';
import { FormAlert } from './FormAlert';
import { validateEmail } from './validation';

const FORM_ID = 'login-form';

export function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextEmailError = validateEmail(email);
    const nextPasswordError = password ? undefined : 'Enter your password.';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setFormError(null);
    if (nextEmailError || nextPasswordError) return;

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    // On success AuthProvider sees the session and the route guard moves to Home.
    if (error) setFormError(authErrorMessage(error));
  }

  return (
    <Screen
      footer={
        <>
          <Button type="submit" form={FORM_ID} fullWidth disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </Button>
          <Button variant="ghost" fullWidth onClick={() => navigate('/age')}>
            Create an account
          </Button>
        </>
      }
    >
      <h1 className="font-display text-h1 font-semibold">Welcome back</h1>
      <p className="mt-2 font-mira text-h3 text-cocoa-soft">Mira kept everything exactly where you left it.</p>

      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        {formError && <FormAlert message={formError} />}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          error={emailError}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          error={passwordError}
          onChange={(e) => setPassword(e.target.value)}
        />
      </form>
    </Screen>
  );
}
