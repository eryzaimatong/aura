import { useState } from 'react';
import { Button } from '../../components/Button';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../lib/auth/context';

/** Signed in, but the profile couldn't be loaded or created. */
export function AccountProblemScreen({ message }: { message: string }) {
  const { retry, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <Screen
      centered
      footer={
        <>
          <Button fullWidth onClick={retry}>
            Try again
          </Button>
          <Button
            variant="ghost"
            fullWidth
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              void signOut();
            }}
          >
            Log out
          </Button>
        </>
      }
    >
      <Mira expression="worried" size="lg" />
      <h1 className="mt-6 font-display text-h2">Mira hit a snag</h1>
      <p className="mt-2 text-body text-cocoa-soft">We couldn’t open your account just now.</p>
      <p role="alert" className="mt-4 rounded-md bg-sand p-4 text-label text-cocoa">
        {message}
      </p>
    </Screen>
  );
}
