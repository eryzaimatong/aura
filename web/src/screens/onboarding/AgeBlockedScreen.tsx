import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';

/** Under 13: no account. Hard rule 4. */
export function AgeBlockedScreen() {
  const navigate = useNavigate();
  return (
    <Screen
      centered
      footer={
        <Button variant="ghost" fullWidth onClick={() => navigate('/welcome', { replace: true })}>
          Back to start
        </Button>
      }
    >
      <Mira expression="shy" size="lg" />
      <h1 className="mt-6 font-display text-h2 font-semibold">AURA is for ages 13 and up</h1>
      <p className="mt-2 text-body text-cocoa-soft">
        We can’t make an account for you yet. Nothing you typed was saved.
      </p>
      <p className="mt-4 font-mira text-h3 text-cocoa-soft">Mira will keep the mirror warm for you.</p>
    </Screen>
  );
}
