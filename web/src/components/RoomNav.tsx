import { useNavigate } from 'react-router';
import { NavBar, type Room } from './NavBar';

const ROOM_PATHS: Record<Room, string> = {
  mirror: '/mirror/card',
  vanity: '/rooms/vanity',
  closet: '/closet',
  looks: '/rooms/looks',
  diary: '/rooms/diary',
};

/** The bottom nav, pinned over scrolling content. Pair with `pb-32` on the screen. */
export function RoomNav({ active }: { active: Room }) {
  const navigate = useNavigate();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[390px] px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      <NavBar className="pointer-events-auto" active={active} onSelect={(room) => navigate(ROOM_PATHS[room])} />
    </div>
  );
}
