import { useLocation, useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';

const SECTIONS = [
  {
    title: 'What we collect',
    body: 'Facial landmark measurements, skin, hair and eye color values, and the clothing photos you choose to upload.',
  },
  {
    title: 'What we never collect',
    body: 'Your selfie. It is processed on your device and discarded as soon as the numbers are read.',
  },
  {
    title: 'Who can see it',
    body: 'Only you. Nothing is shared or sold. Analytics are aggregated and carry no identifying data.',
  },
  {
    title: 'Your rights',
    body: 'Export or delete everything from Settings. Deletion is immediate and permanent.',
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
