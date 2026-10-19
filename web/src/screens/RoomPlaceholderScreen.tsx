import { Navigate, useParams } from 'react-router';

// Every room is built now; old /rooms/* links go to the real screens.
const ROOMS: Record<string, string> = { vanity: '/vanity', looks: '/looks', diary: '/diary' };

export function RoomPlaceholderScreen() {
  const { room = '' } = useParams();
  return <Navigate to={ROOMS[room] ?? '/'} replace />;
}
