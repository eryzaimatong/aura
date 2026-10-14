import type { LucideIcon } from 'lucide-react';
import { BookHeart, Brush, Layers, ScanFace, Shirt } from 'lucide-react';
import { cx } from '../lib/cx';

export type Room = 'mirror' | 'vanity' | 'closet' | 'looks' | 'diary';

// Placeholder icons until custom room icons are supplied in /assets.
const ROOMS: ReadonlyArray<{ room: Room; label: string; Icon: LucideIcon }> = [
  { room: 'mirror', label: 'Mirror', Icon: ScanFace },
  { room: 'vanity', label: 'Vanity', Icon: Brush },
  { room: 'closet', label: 'Closet', Icon: Shirt },
  { room: 'looks', label: 'Looks', Icon: Layers },
  { room: 'diary', label: 'Diary', Icon: BookHeart },
];

export interface NavBarProps {
  active: Room;
  onSelect: (room: Room) => void;
  className?: string;
}

/** Floating bottom nav across the five rooms. */
export function NavBar({ active, onSelect, className }: NavBarProps) {
  return (
    <nav aria-label="Rooms" className={cx('rounded-lg bg-paper p-2 shadow-card', className)}>
      <ul className="flex items-stretch justify-between">
        {ROOMS.map(({ room, label, Icon }) => {
          const isActive = room === active;
          return (
            <li key={room} className="flex-1">
              <button
                type="button"
                onClick={() => onSelect(room)}
                aria-current={isActive ? 'page' : undefined}
                className={cx(
                  'flex h-16 w-full flex-col items-center justify-center gap-1 rounded-sm transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep',
                  isActive ? 'bg-butter font-bold text-cocoa' : 'text-cocoa-soft hover:bg-sand',
                )}
              >
                <Icon aria-hidden="true" size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                <span className="text-caption">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
