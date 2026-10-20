import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useProfile } from '../../lib/auth/context';
import { track } from '../../lib/analytics';
import { authErrorMessage } from '../../lib/authErrors';
import { deleteItem, localToday, logWearToday } from '../../lib/closet/data';
import { CATEGORY_LABEL, capitalize, SEASONALITY_LABEL, shortDate, SUBCATEGORIES } from '../../lib/closet/labels';
import { mostWornRank, ordinal, pairsFor } from '../../lib/closet/pairs';
import { FormAlert } from '../onboarding/FormAlert';
import { SplashScreen } from '../SplashScreen';
import { ItemPhoto } from './ItemPhoto';
import { useCloset } from './useCloset';

export function ItemDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const profile = useProfile();
  const { state, reload } = useCloset();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (state.status === 'loading') return <SplashScreen />;
  if (state.status === 'error') return <Navigate to="/closet" replace />;
  const item = state.items.find((i) => i.id === id);
  if (!item) return <Navigate to="/closet" replace />;

  const rank = mostWornRank(item, state.items);
  const pairs = pairsFor(item, state.items, state.log);
  const wornToday = item.lastWorn === localToday();
  const colour = item.dominant_colors[0]?.name;
  const kind = SUBCATEGORIES[item.category].find((s) => s.key === item.subcategory)?.label;

  async function wore() {
    setBusy(true);
    setError(null);
    try {
      const added = await logWearToday(profile.id, item!.id);
      if (added) track(profile, 'wear_logged', { category: item!.category });
      setNote(added ? 'Logged for today ✦' : 'Already logged for today.');
      reload();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteItem(item!);
      navigate('/closet', { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          <Button fullWidth disabled={busy || wornToday} onClick={() => void wore()}>
            {wornToday ? 'Worn today ✓' : 'I wore this today'}
          </Button>
          <Button variant={confirmDelete ? 'danger' : 'ghost'} fullWidth disabled={busy}
            onClick={() => (confirmDelete ? void remove() : setConfirmDelete(true))}>
            {confirmDelete ? 'Tap again to delete for good' : 'Remove from closet'}
          </Button>
        </>
      }
    >
      <ScreenHeader title={item.name} backTo="/closet" />
      <ItemPhoto src={state.urls.get(item.image_path)} alt={item.name} className="aspect-square rounded-lg" />

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-pill bg-lilac px-4 py-2 text-label">{kind ?? CATEGORY_LABEL[item.category]}</span>
        {colour && <span className="rounded-pill border-2 border-track bg-paper px-4 py-2 text-label">{capitalize(colour)}</span>}
        {item.in_palette && <span className="rounded-pill border-2 border-track bg-paper px-4 py-2 text-label">In palette</span>}
        {item.seasonality && item.seasonality !== 'all' && (
          <span className="rounded-pill border-2 border-track bg-paper px-4 py-2 text-label">{SEASONALITY_LABEL[item.seasonality]}</span>
        )}
        <Link to={`/closet/item/${item.id}/edit`} className="self-center text-label font-bold text-gold-deep underline">Edit</Link>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Stat value={String(item.wearCount)} label={item.wearCount === 1 ? 'wear' : 'wears'} />
        <Stat value={item.lastWorn ? shortDate(item.lastWorn) : '—'} label="last worn" />
        <Stat value={rank ? ordinal(rank) : '—'} label="most worn" />
      </dl>
      {item.category !== 'accessory' && (
        <Button variant="outline" fullWidth className="mt-4" onClick={() => navigate(`/looks?item=${item.id}`)}>
          Style this piece
        </Button>
      )}
      {note && <p role="status" className="mt-3 text-center text-label text-success">{note}</p>}
      {error && <div className="mt-3"><FormAlert message={error} /></div>}

      <Card className="mt-4">
        <p className="text-label font-bold">Pairs well with</p>
        {pairs.length === 0 ? (
          <p className="mt-2 text-caption text-cocoa-soft">Log a few wears and add more pieces — Mira will spot what goes together.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-3 gap-3">
            {pairs.map(({ item: p, reason }) => (
              <li key={p.id}>
                <Link to={`/closet/item/${p.id}`} className="block">
                  <ItemPhoto src={state.urls.get(p.image_path)} alt={p.name} className="aspect-square" />
                  <p className="mt-1 line-clamp-1 text-micro font-bold">{p.name}</p>
                  <p className="text-micro text-cocoa-soft">{reason}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    // dt must precede dd in the markup; flex-col-reverse shows the number on top.
    <div className="flex flex-col-reverse rounded-md bg-paper p-3 shadow-soft">
      <dt className="text-micro text-cocoa-soft">{label}</dt>
      <dd className="font-display text-stat font-semibold">{value}</dd>
    </div>
  );
}
