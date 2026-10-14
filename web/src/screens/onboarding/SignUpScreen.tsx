import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { authErrorMessage } from '../../lib/authErrors';
import type { SignupMetadata } from '../../lib/profile';
import { supabase } from '../../lib/supabase';
import { authRedirectUrl, readSignupFlowState } from './flowState';
import { FormAlert } from './FormAlert';
import { validateEmail, validateName, validatePassword } from './validation';

const FORM_ID = 'signup-form';

type FieldErrors = Partial<Record<'name' | 'email' | 'password', string>>;

export function SignUpScreen() {
  const navigate = useNavigate();
  const flow = readSignupFlowState(useLocation().state);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Hard rule 4: no age check, no signup.
  if (!flow) return <Navigate to="/age" replace />;
  const { bracket, guardianOk } = flow;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors: FieldErrors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setFieldErrors(errors);
    setFormError(null);
    if (errors.name || errors.email || errors.password) return;

    setSubmitting(true);
    // The profile row is written on the first session (see ensureProfile);
    // until then these details wait on the auth user. Bracket only, never a date.
    const metadata: SignupMetadata = { display_name: name.trim(), age_bracket: bracket, guardian_ok: guardianOk };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { ...metadata }, emailRedirectTo: authRedirectUrl() },
    });
    setSubmitting(false);

    if (error) return setFormError(authErrorMessage(error));
    // With email confirmation on, Supabase hides existing accounts by returning a user with no identities.
    if (data.user && data.user.identities?.length === 0) {
      return setFormError('There’s already an account with this email. Try logging in instead.');
    }
    // A session means confirmation is off: AuthProvider takes over and routes to Home.
    if (!data.session) navigate('/check-email', { replace: true, state: { email: email.trim() } });
  }

  return (
    <Screen
      footer={
        <>
          <Button type="submit" form={FORM_ID} fullWidth disabled={submitting}>
            {submitting ? 'Creating your account…' : 'Create account'}
          </Button>
          <Button variant="ghost" fullWidth onClick={() => navigate('/login')}>
            I already have one
          </Button>
        </>
      }
    >
      <Mira expression="hello" size="md" />
      <h1 className="mt-4 font-display text-h1 font-semibold">Make your Aura</h1>
      <p className="mt-2 text-body text-cocoa-soft">
        Your card, closet and looks stay on your account so you can switch phones.
      </p>

      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        {formError && <FormAlert message={formError} />}
        <Input
          label="Name"
          autoComplete="given-name"
          value={name}
          error={fieldErrors.name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          error={fieldErrors.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          value={password}
          error={fieldErrors.password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </form>
    </Screen>
  );
}
