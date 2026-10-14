import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';

export function WelcomeScreen() {
  const navigate = useNavigate();
  return (
    <Screen
      centered
      footer={
        <>
          <Button fullWidth icon={<Sparkles size={18} />} onClick={() => navigate('/age')}>
            Get started
          </Button>
          <Button variant="ghost" fullWidth onClick={() => navigate('/login')}>
            I already have an account
          </Button>
        </>
      }
    >
      <Mira expression="hello" size="xl" />
      <h1 className="mt-8 font-display text-display font-semibold">AURA</h1>
      <p className="mt-2 font-mira text-h3 text-cocoa-soft">your digital vanity</p>
      <p className="mt-3 text-body text-cocoa-soft">
        Scan once. Mira learns your face shape and colors, then every room knows what suits you.
      </p>
    </Screen>
  );
}
