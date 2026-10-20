import { useLocation, useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';

// Must match what the code actually does. Change it together with the code, never ahead of it.
const SECTIONS = [
  {
    title: 'What we collect',
    body: 'From a scan: five face-shape ratios, a skin and eye color reading, a skin-tone band and a lighting score. '
      + 'The clothing photos you add, what you log wearing, and anything you choose to type in: body measurements, '
      + 'style quiz answers, goals and trips.',
  },
  {
    title: 'What we never collect',
    body: 'Your selfie. It is processed on your phone and discarded as soon as the numbers are read. No weight, and no exact location.',
  },
  {
    title: 'Who can see it',
    body: 'Only you. Nothing is shared or sold. Usage analytics are off unless you turn them on in Settings; '
      + 'they never include photos, names or measurements, and they’re unlinked from you when you delete your account.',
  },
  {
    title: 'Services we use',
    body: 'Your account and data are stored with Supabase. For weather, a place name or a location rounded to about '
      + '11 km is sent to Open-Meteo, and nothing that identifies you goes with it.',
  },
  {
    title: 'Your rights',
    body: 'Export or delete your data any time from Settings → Data and privacy. Deletion is immediate and permanent.',
  },
] as const;

/** Plain-language policy. Readable signed in or out. */
export function PrivacyNoticeScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  // Opened directly (no history in this app): go somewhere sensible instead of leaving the app.
  const goBack = () => (location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1));

  return (
    <Screen
      footer={
        <Button fullWidth onClick={goBack}>
          Got it
        </Button>
      }
    >
      <ScreenHeader title="Privacy notice" />
      <div className="flex flex-col gap-3">
        {SECTIONS.map((s) => (
          <Card key={s.title}>
            <h2 className="text-body font-bold">{s.title}</h2>
            <p className="mt-1 text-caption text-cocoa-soft">{s.body}</p>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-micro text-cocoa-soft">
        Face data is sensitive personal information under the Data Privacy Act of 2012 (RA 10173).
      </p>
    </Screen>
  );
}
