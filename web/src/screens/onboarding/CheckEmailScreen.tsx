import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { authErrorMessage } from '../../lib/authErrors';
import { supabase } from '../../lib/supabase';
import { authRedirectUrl, readEmailState } from './flowState';
import { FormAlert } from './FormAlert';

const RESEND_COOLDOWN_S = 60;

/** After signup with email confirmation on. */
export function CheckEmailScreen() {
  const navigate = useNavigate();
  const email = readEmailState(useLocation().state);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    if (!email) return;
    setError(null);
    setSent(false);
    setCooldown(RESEND_COOLDOWN_S);
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: authRedirectUrl() },
    });
    if (err) setError(authErrorMessage(err));
    else setSent(true);
  }

  return (
    <Screen
      centered
      footer={
        <>
          {email && (
            <Button variant="outline" fullWidth disabled={cooldown > 0} onClick={() => void resend()}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend the link'}
            </Button>
          )}
          <Button variant="ghost" fullWidth onClick={() => navigate('/login', { replace: true })}>
            Go to log in
          </Button>
        </>
      }
    >
      <Mira expression="found-it" size="lg" />
      <h1 className="mt-6 font-display text-h2 font-semibold">Check your inbox</h1>
      <p className="mt-2 text-body text-cocoa-soft">
        We sent a link to {email ? <strong className="text-cocoa">{email}</strong> : 'your email'}. Tap it to finish
        making your Aura.
      </p>
      <p className="mt-4 font-mira text-h3 text-cocoa-soft">Can’t see it? Peek in spam.</p>
      <div className="mt-4 w-full text-left">
        {error && <FormAlert message={error} />}
        {sent && (
          <p role="status" className="text-center text-label text-success">
            Sent again. It can take a minute.
          </p>
        )}
      </div>
    </Screen>
  );
}
