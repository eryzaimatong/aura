import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CalendarHeart, Layers, ScanFace, Shirt } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Card } from '../components/Card';
import { Mira } from '../components/Mira';
import { RoomNav } from '../components/RoomNav';
import { Screen } from '../components/Screen';
import { isMinor } from '../lib/ageBracket';
import { useAuth, useProfile } from '../lib/auth/context';
import { FACE_SHAPE_NAMES, SEASON_NAMES } from '../lib/seasons';
import { useCloset } from './closet/useCloset';
import { OutfitCollage } from './looks/OutfitCollage';
import { useOutfit } from './looks/useOutfit';
import { useWeather } from './looks/useWeather';
import { useCurrentCard } from './mirror/useCurrentCard';

const TILES: ReadonlyArray<{ to: string; label: string; Icon: LucideIcon; tint: string }> = [
  { to: '/mirror', label: 'Scan again', Icon: ScanFace, tint: 'bg-butter' },
  { to: '/closet/add', label: 'Add clothes', Icon: Shirt, tint: 'bg-tint-lilac' },
  { to: '/looks', label: 'Build a look', Icon: Layers, tint: 'bg-tint-pink' },
  { to: '/diary', label: 'This month', Icon: CalendarHeart, tint: 'bg-tint-sage' },
];

function greeting(hour: number): string {
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export function HomeScreen() {
  const profile = useProfile();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const { state: cardState } = useCurrentCard();
  const { state: closet } = useCloset();
  const weather = useWeather();
  const w = weather.state.status === 'loading' ? undefined : weather.state.status === 'ready' ? weather.state.weather : null;
  // Same seed as Today, so the preview matches the full screen. Not tracked: Home loads it on every visit.
  const { state: outfit } = useOutfit(null, w, { trackGenerated: false });

  const card = cardState.status === 'ready' ? cardState.card : null;
  const items = closet.status === 'ready' ? closet.items : [];
  const paletteTops = items.filter((i) => i.in_palette && i.category === 'top').length;
  const tip = !card
    ? { line: 'one selfie unlocks your palette', body: 'Scan once and every room learns what suits you.', to: '/mirror' }
    : items.length < 5
      ? { line: 'let’s fill your closet', body: 'Add the pieces you reach for most and outfits start appearing.', to: '/closet/start' }
      : { line: 'found something for you', body: `${paletteTops} ${paletteTops === 1 ? 'top' : 'tops'} in your closet match your palette.`, to: '/closet' };

  return (
    <Screen className="pb-32">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-h2 font-semibold">{greeting(new Date().getHours())}, {profile.display_name}</h1>
          {card && (
            <p className="text-caption text-cocoa-soft">
              {card.season ? `${SEASON_NAMES[card.season]} · ` : ''}{FACE_SHAPE_NAMES[card.face_shape].toLowerCase()} face
            </p>
          )}
        </div>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-tint-lilac"><Mira expression="hello" size="sm" /></span>
      </header>

      <Link to={tip.to} className="mt-4 block">
        <Card tone="lilac" flat className="flex items-center gap-3">
          <Mira expression="found-it" size="sm" />
          <div>
            <p className="font-mira text-h3 text-cocoa-soft">{tip.line} ✦</p>
            <p className="text-caption text-cocoa-soft">{tip.body}</p>
          </div>
        </Card>
      </Link>

      <h2 className="mt-6 text-label font-bold">Today</h2>
      <Link to="/today" className="mt-2 block" aria-label="Open today’s outfit">
        <Card className="flex flex-col gap-3">
          {outfit.status === 'ready' && closet.status === 'ready' ? (
            <>
              <OutfitCollage outfit={outfit.outfit} items={closet.items} urls={closet.urls} />
              <div className="flex flex-wrap gap-2">
                {outfit.outfit.tags.slice(0, 1).map((t) => <span key={t} className="rounded-pill bg-lilac px-4 py-2 text-label">{t}</span>)}
                <span className="rounded-pill border-2 border-track px-4 py-2 text-label">{outfit.outfit.pieces.length} items you own</span>
              </div>
            </>
          ) : outfit.status === 'need_items' ? (
            <p className="text-body text-cocoa-soft">Add a few pieces and Mira will plan what to wear each day.</p>
          ) : outfit.status === 'error' ? (
            <p className="text-body text-cocoa-soft">Today’s outfit isn’t ready. Tap to try again.</p>
          ) : (
            <div className="h-48 animate-pulse rounded-md bg-tint-lilac" aria-label="Loading today’s outfit" />
          )}
        </Card>
      </Link>

      <h2 className="mt-6 text-label font-bold">Jump back in</h2>
      <ul className="mt-2 grid grid-cols-2 gap-3">
        {TILES.map(({ to, label, Icon, tint }) => (
          <li key={to}>
            <button type="button" onClick={() => navigate(to)}
              className="flex w-full flex-col items-start gap-3 rounded-md bg-paper p-4 text-left shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep">
              <span className={`flex size-11 items-center justify-center rounded-sm ${tint}`}><Icon aria-hidden="true" size={22} /></span>
              <span className="text-body font-bold">{label}</span>
            </button>
          </li>
        ))}
      </ul>

      {isMinor(profile.age_bracket) && <p className="mt-4 text-caption text-cocoa-soft">Sharing and the shop stay off on under-18 accounts.</p>}
      <button type="button" disabled={signingOut} onClick={() => { setSigningOut(true); void signOut(); }}
        className="mt-6 self-center text-label text-cocoa-soft underline">
        Log out
      </button>
      <RoomNav active={null} />
    </Screen>
  );
}
