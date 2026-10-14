import { Button } from '../../../components/Button';
import { Mira } from '../../../components/Mira';
import { Screen } from '../../../components/Screen';
import { FormAlert } from '../../onboarding/FormAlert';

export interface ScanErrorViewProps {
  message: string;
  /** Resend the same numbers; absent when there is nothing to resend. */
  onRetry?: () => void;
  onRetake: () => void;
}

export function ScanErrorView({ message, onRetry, onRetake }: ScanErrorViewProps) {
  return (
    <Screen
      centered
      footer={
        <>
          {onRetry && (
            <Button fullWidth onClick={onRetry}>
              Try again
            </Button>
          )}
          <Button variant={onRetry ? 'ghost' : 'primary'} fullWidth onClick={onRetake}>
            Retake photo
          </Button>
        </>
      }
    >
      <Mira expression="worried" size="lg" />
      <h1 className="mt-6 font-display text-h2 font-semibold">Mira hit a snag</h1>
      <div className="mt-4 w-full text-left">
        <FormAlert message={message} />
      </div>
    </Screen>
  );
}
