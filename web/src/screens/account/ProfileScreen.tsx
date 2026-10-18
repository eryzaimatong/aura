import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card } from '../../components/Card';
import { ListRow, ListSection } from '../../components/ListRow';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useProfile } from '../../lib/auth/context';
import { streak } from '../../lib/diary';
import { FACE_SHAPE_NAMES, SEASON_NAMES } from '../../lib/seasons';
import { supabase } from '../../lib/supabase';
import { useCloset } from '../closet/useCloset';
import { useCurrentCard } from '../mirror/useCurrentCard';

export function ProfileScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const { state: cardState } = useCurrentCard();
  const { state: closet } = useCloset();
  const [looks, setLooks] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('outfits').select('id', { count: 'exact', head: true }).eq('user_id', profile.id)
      .then(({ count }) => setLooks(count ?? 0));
  }, [profile.id]);

  const card = cardState.status === 'ready' ? cardState.card : null;
  const subtitle = card
    ? `${card.season ? `${SEASON_NAMES[card.season]} · ` : ''}${FACE_SHAPE_NAMES[card.face_shape].toLowerCase()} face`
    : 'No Aura Card yet';
  const items = closet.status === 'ready' ? String(closet.items.length) : '—';
  const days = closet.status === 'ready' ? `${streak(closet.log, new Date())}d` : '—';

  return (
    <Screen>
      <ScreenHeader title="Profile" backTo="/" />

      <Card className="flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-pill bg-tint-lilac">
          <Mira expression="hello" size="sm" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-h3 font-semibold">{profile.display_name}</p>
          <p className="text-caption text-cocoa-soft">{subtitle}</p>
        </div>
      </Card>

      <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
        <Stat value={items} label="items" />
        <Stat value={looks === null ? '—' : String(looks)} label="looks" />
        <Stat value={days} label="streak" />
      </dl>

      <div className="mt-6 flex flex-col gap-6">
        <ListSection title="Your profile">
          <ListRow label="Aura Card" value={card?.season ? SEASON_NAMES[card.season] : card ? 'Colors to finish' : 'Scan'}
            onClick={() => navigate(card ? '/mirror/card' : '/mirror')} />
          <ListRow label="Body measurements" soon />
          <ListRow label="Style Print" soon />
          <ListRow label="Glow-up roadmap" soon />
        </ListSection>
        <ListSection title="Account">
          <ListRow label="Settings" onClick={() => navigate('/settings')} />
          <ListRow label="Data and privacy" onClick={() => navigate('/privacy/data')} />
        </ListSection>
      </div>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse rounded-md bg-paper p-3 shadow-soft">
      <dt className="text-micro text-cocoa-soft">{label}</dt>
      <dd className="font-display text-stat font-semibold">{value}</dd>
    </div>
  );
}
