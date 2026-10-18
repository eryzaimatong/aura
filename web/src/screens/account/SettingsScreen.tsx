import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { ListRow, ListSection } from '../../components/ListRow';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Toggle } from '../../components/Toggle';
import { useAuth, useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import { hasCurrentConsent, recordConsent } from '../../lib/consent';
import { FormAlert } from '../onboarding/FormAlert';
import { NameEditor } from './NameEditor';

export function SettingsScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const { state, signOut, updateProfile } = useAuth();
  const email = state.status === 'ready' ? state.session.user.email : undefined;
  const [editingName, setEditingName] = useState(false);
  const [faceScans, setFaceScans] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hasCurrentConsent(profile.id, 'face_scan').then(setFaceScans).catch(() => setFaceScans(null));
  }, [profile.id]);

  /** Every change of mind is a new consent event, never an edit (hard rule 3). */
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const setAnalytics = (on: boolean) => run(async () => {
    await recordConsent(profile.id, 'analytics', on);
    await updateProfile({ share_analytics: on });
  });
  const setScans = (on: boolean) => run(async () => {
    await recordConsent(profile.id, 'face_scan', on);
    setFaceScans(on);
  });

  return (
    <Screen
      footer={
        <Button variant="ghost" fullWidth disabled={busy} onClick={() => void signOut()}>
          Log out
        </Button>
      }
    >
      <ScreenHeader title="Settings" backTo="/profile" />
      {error && <div className="mb-4"><FormAlert message={error} /></div>}

      <div className="flex flex-col gap-6">
        <ListSection title="Account">
          {editingName ? (
            <NameEditor initial={profile.display_name} onDone={() => setEditingName(false)} />
          ) : (
            <ListRow label="Name" value={profile.display_name} onClick={() => setEditingName(true)} />
          )}
          <ListRow label="Email" value={email ?? '—'} />
          <ListRow label="Password" value="Change" onClick={() => navigate('/account/password')} />
        </ListSection>

        <ListSection title="App">
          <ListRow label="Region" value="Philippines" />
          <ListRow label="Units" value={profile.units === 'in' ? 'inches' : 'cm'}
            onClick={() => void run(() => updateProfile({ units: profile.units === 'in' ? 'cm' : 'in' }))} />
          <ListRow label="Notifications" soon />
          <ListRow label="Help improve Mira" hint="Share anonymous usage and accuracy feedback"
            control={<Toggle label="Help improve Mira" checked={profile.share_analytics} disabled={busy}
              onChange={(on) => void setAnalytics(on)} />} />
        </ListSection>

        <ListSection title="Privacy">
          <ListRow label="Face scans" hint="Turning this off stops new scans. Delete past data in Data and privacy."
            control={<Toggle label="Allow face scans" checked={faceScans === true} disabled={busy || faceScans === null}
              onChange={(on) => void setScans(on)} />} />
          <ListRow label="Data and privacy" onClick={() => navigate('/privacy/data')} />
          <ListRow label="Privacy notice" onClick={() => navigate('/privacy')} />
        </ListSection>
      </div>
    </Screen>
  );
}
