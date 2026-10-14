import { useNavigate } from 'react-router';
import { Button } from '../../../components/Button';
import { Mira } from '../../../components/Mira';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FormAlert } from '../../onboarding/FormAlert';
import { useCurrentCard } from '../useCurrentCard';
import { AuraCardFace } from './AuraCardFace';
import { ConfidencePanel } from './ConfidencePanel';

export function AuraCardScreen() {
  const navigate = useNavigate();
  const { state, retry } = useCurrentCard();

  if (state.status === 'loading') {
    return (
      <Screen centered>
        <Mira expression="thinking" size="md" className="animate-pulse" />
        <p role="status" className="mt-4 font-mira text-h3 text-cocoa-soft">fetching your card…</p>
      </Screen>
    );
  }

  if (state.status === 'none') {
    return (
      <Screen
        centered
        footer={<Button fullWidth onClick={() => navigate('/mirror')}>Take my selfie</Button>}
      >
        <Mira expression="hello" size="lg" />
        <h1 className="mt-6 font-display text-h2 font-semibold">No Aura Card yet</h1>
        <p className="mt-2 text-body text-cocoa-soft">One selfie and Mira will read your face shape and colors.</p>
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen centered footer={<Button fullWidth onClick={retry}>Try again</Button>}>
        <Mira expression="worried" size="lg" />
        <h1 className="mt-6 font-display text-h2 font-semibold">Mira couldn’t find your card</h1>
        <div className="mt-4 w-full text-left">
          <FormAlert message={state.message} />
        </div>
      </Screen>
    );
  }

  const { card, scan } = state;
  return (
    <Screen
      footer={
        <>
          <Button variant="outline" fullWidth onClick={() => navigate('/mirror/scan')}>
            Scan again
          </Button>
          <Button variant="ghost" fullWidth onClick={() => navigate('/')}>
            Done
          </Button>
        </>
      }
    >
      <ScreenHeader title="Your Aura Card" backTo="/" />
      <AuraCardFace card={card} />
      <div className="mt-4">
        <ConfidencePanel card={card} scan={scan} userSet={state.userSet} />
      </div>
      <button
        type="button"
        onClick={() => navigate('/mirror/correct')}
        className="mt-4 self-center text-label font-bold text-gold-deep underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep"
      >
        This doesn’t look like me
      </button>

      {import.meta.env.DEV && scan && (
        <details className="mt-4 rounded-sm bg-sand p-3 text-micro text-cocoa-soft">
          <summary className="cursor-pointer font-bold">Debug: raw scan (dev only)</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(scan, null, 2)}</pre>
        </details>
      )}
    </Screen>
  );
}
