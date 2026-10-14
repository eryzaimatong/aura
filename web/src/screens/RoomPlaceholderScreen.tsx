import { Navigate, useParams } from 'react-router';
import { Mira } from '../components/Mira';
import { RoomNav } from '../components/RoomNav';
import { Screen } from '../components/Screen';

const BUILT: Record<string, string> = { looks: '/looks', diary: '/diary' };

/** Rooms not built yet (the Vanity): a calm "coming soon" instead of a dead link. */
export function RoomPlaceholderScreen() {
  const { room = '' } = useParams();
  if (BUILT[room]) return <Navigate to={BUILT[room]} replace />;
  if (room !== 'vanity') return <Navigate to="/" replace />;
  return (
    <Screen centered className="pb-32">
      <Mira expression="sleepy" size="lg" />
      <h1 className="mt-6 font-display text-h2 font-semibold">The Vanity</h1>
      <p className="mt-2 text-body text-cocoa-soft">Makeup and hair that suit your Aura Card are on the way.</p>
      <p className="mt-4 font-mira text-h3 text-cocoa-soft">Mira is still setting up this room ✦</p>
      <RoomNav active="vanity" />
    </Screen>
  );
}
