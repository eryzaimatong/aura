import { Navigate, useParams } from 'react-router';
import { Mira } from '../components/Mira';
import { RoomNav } from '../components/RoomNav';
import { Screen } from '../components/Screen';

const ROOMS = {
  vanity: { title: 'The Vanity', line: 'Makeup and hair that suit your Aura Card are on the way.' },
  looks: { title: 'Looks', line: 'Outfits built from your own closet are on the way.' },
  diary: { title: 'The Diary', line: 'Streaks and what you actually wear are on the way.' },
} as const;

/** Rooms not built yet: a calm "coming soon" instead of a dead link. */
export function RoomPlaceholderScreen() {
  const { room } = useParams();
  if (room !== 'vanity' && room !== 'looks' && room !== 'diary') return <Navigate to="/" replace />;
  const { title, line } = ROOMS[room];
  return (
    <Screen centered className="pb-32">
      <Mira expression="sleepy" size="lg" />
      <h1 className="mt-6 font-display text-h2 font-semibold">{title}</h1>
      <p className="mt-2 text-body text-cocoa-soft">{line}</p>
      <p className="mt-4 font-mira text-h3 text-cocoa-soft">Mira is still setting up this room ✦</p>
      <RoomNav active={room} />
    </Screen>
  );
}
