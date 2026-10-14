import { Mira } from '../components/Mira';
import { Screen } from '../components/Screen';

/** Shown while the session and profile load. */
export function SplashScreen() {
  return (
    <Screen centered>
      <Mira expression="hello" size="lg" className="animate-pulse" />
      <p className="mt-4 font-mira text-h3 text-cocoa-soft" role="status">
        polishing the mirror…
      </p>
    </Screen>
  );
}
