import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Camera, ChartColumn, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Checkbox } from '../../components/Checkbox';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import { recordConsent } from '../../lib/consent';
import { FormAlert } from '../onboarding/FormAlert';

const PROMISES: ReadonlyArray<{ Icon: LucideIcon; title: string; body: string }> = [
  { Icon: Camera, title: 'Analyzed on your phone', body: 'The photo never leaves your device.' },
  { Icon: ChartColumn, title: 'Only numbers are saved', body: 'Measurements and colors, never the image.' },
  { Icon: X, title: 'Delete any time', body: 'Clearing your Aura Card wipes the data.' },
];

export function ConsentScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAgree() {
    setSaving(true);
    setError(null);
    try {
      await recordConsent(profile.id, 'face_scan', true);
      navigate('/mirror/scan', { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          <Button fullWidth disabled={!agreed || saving} onClick={() => void handleAgree()}>
            {saving ? 'Saving…' : 'Agree and continue'}
          </Button>
          <Button variant="ghost" fullWidth onClick={() => navigate('/privacy')}>
            Read the full notice
          </Button>
        </>
      }
    >
      <ScreenHeader title="Before we scan" backTo="/" />
      <p className="text-body text-cocoa-soft">
        Mira needs one photo to read your features. Here is exactly what happens to it.
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {PROMISES.map(({ Icon, title, body }) => (
          <li key={title}>
            <Card className="flex items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-sm bg-sand text-cocoa">
                <Icon size={22} aria-hidden="true" />
              </span>
              <div>
                <p className="text-body font-bold">{title}</p>
                <p className="text-caption text-cocoa-soft">{body}</p>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Checkbox checked={agreed} onChange={setAgreed} className="mt-4">
        I agree to the privacy terms
      </Checkbox>
      {error && (
        <div className="mt-4">
          <FormAlert message={error} />
        </div>
      )}
    </Screen>
  );
}
