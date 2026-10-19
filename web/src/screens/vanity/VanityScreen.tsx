import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { Mira } from '../../components/Mira';
import { RoomNav } from '../../components/RoomNav';
import { Screen } from '../../components/Screen';
import { apiErrorMessage } from '../../lib/apiErrors';
import { useProfile } from '../../lib/auth/context';
import { FACE_SHAPE_NAMES, SEASON_NAMES } from '../../lib/seasons';
import { dismiss, loadVanity, setSaved, type VanityKind, type VanityRec } from '../../lib/vanity';
import { FormAlert } from '../onboarding/FormAlert';
import { useCurrentCard } from '../mirror/useCurrentCard';
import { RecCard } from './RecCard';

const TABS: ReadonlyArray<{ value: VanityKind; label: string }> = [
  { value: 'makeup', label: 'Makeup' },
  { value: 'hair', label: 'Hair' },
  { value: 'colors', label: 'Colors' },
];
const SHOWN = 3;

export function VanityScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const { state: card } = useCurrentCard();
  const [tab, setTab] = useState<VanityKind>('makeup');
  const [recs, setRecs] = useState<VanityRec[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const cardId = card.status === 'ready' ? card.card.id : null;
  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    setRecs(null);
    loadVanity(profile.id, cardId)
      .then((r) => !cancelled && setRecs(r))
      .catch((err: unknown) => !cancelled && setError(apiErrorMessage(err)));
    return () => { cancelled = true; };
  }, [profile.id, cardId]);

  async function act(rec: VanityRec, change: () => Promise<void>, patch: Partial<VanityRec>) {
    setBusyId(rec.id);
    try {
      await change();
      setRecs((rs) => rs?.map((r) => (r.id === rec.id ? { ...r, ...patch } : r)) ?? null);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const c = card.status === 'ready' ? card.card : null;
  const visible = (recs ?? []).filter((r) => r.kind === tab && !r.dismissed).slice(0, SHOWN);
  const tip = c ? `Picks that suit ${c.season ? SEASON_NAMES[c.season] : 'you'} and a ${FACE_SHAPE_NAMES[c.face_shape].toLowerCase()} face` : '';

  return (
    <Screen className="pb-32">
      <h1 className="font-display text-h1 font-semibold">For you</h1>

      {card.status === 'none' && (
        <div className="mt-10 flex flex-col items-center text-center">
          <Mira expression="hello" size="lg" />
          <p className="mt-4 text-body text-cocoa-soft">One selfie and the Vanity fills with makeup, hair and color picks that suit you.</p>
          <Button className="mt-6" onClick={() => navigate('/mirror')}>Take my selfie</Button>
        </div>
      )}

      {c && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {TABS.map((t) => <Chip key={t.value} selected={tab === t.value} onClick={() => setTab(t.value)}>{t.label}</Chip>)}
          </div>
          <Card tone="lilac" flat className="mt-4 flex items-center gap-3">
            <Mira expression="found-it" size="sm" />
            <div>
              <p className="font-mira text-h3 text-cocoa-soft">found something for you ✦</p>
              <p className="text-caption text-cocoa-soft">{tip}</p>
            </div>
          </Card>

          {error && <div className="mt-4"><FormAlert message={error} /></div>}
          {!recs && !error && <p role="status" className="mt-8 text-center font-mira text-h3 text-cocoa-soft">gathering ideas…</p>}

          <div className="mt-4 flex flex-col gap-3">
            {visible.map((r) => (
              <RecCard key={r.id} rec={r} busy={busyId === r.id}
                onSave={() => void act(r, () => setSaved(profile.id, r.id, !r.saved), { saved: !r.saved })}
                onDismiss={() => void act(r, () => dismiss(profile.id, r.id), { dismissed: true })} />
            ))}
          </div>

          {recs && visible.length === 0 && (
            <p className="mt-6 text-center text-body text-cocoa-soft">
              {tab !== 'hair' && !c.season ? 'Finish your colors and Mira can suggest shades.' : 'That’s every pick for now — rescan anytime for fresh ideas.'}
            </p>
          )}
          {recs && !c.season && tab !== 'hair' && (
            <Button className="mt-4" variant="outline" fullWidth onClick={() => navigate('/mirror/quiz')}>Finish my colors</Button>
          )}
        </>
      )}
      <RoomNav active="vanity" />
    </Screen>
  );
}
