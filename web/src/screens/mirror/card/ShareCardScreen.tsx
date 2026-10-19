import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../../components/Button';
import { Chip } from '../../../components/Chip';
import { Mira } from '../../../components/Mira';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Toggle } from '../../../components/Toggle';
import { isMinor } from '../../../lib/ageBracket';
import { track } from '../../../lib/analytics';
import { useProfile } from '../../../lib/auth/context';
import { cx } from '../../../lib/cx';
import { shareImage } from '../../../lib/download';
import { FACE_SHAPE_NAMES, SEASON_BLURBS, SEASON_NAMES, UNDERTONE_NAMES } from '../../../lib/seasons';
import { FORMATS, renderShareCard, type ShareFormat } from '../../../lib/shareCard';
import { FormAlert } from '../../onboarding/FormAlert';
import { useCurrentCard } from '../useCurrentCard';

export function ShareCardScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const { state } = useCurrentCard();
  const [format, setFormat] = useState<ShareFormat>('story');
  const [showDetails, setShowDetails] = useState(false);
  const [showName, setShowName] = useState(false);
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const card = state.status === 'ready' ? state.card : null;
  const minor = isMinor(profile.age_bracket);

  useEffect(() => {
    if (!card?.season || minor) return;
    let cancelled = false;
    let url: string | null = null;
    const details = `${FACE_SHAPE_NAMES[card.face_shape]} face${card.skin_undertone ? ` · ${UNDERTONE_NAMES[card.skin_undertone]} undertone` : ''}`;
    renderShareCard({
      season: SEASON_NAMES[card.season],
      palette: card.palette,
      blurb: SEASON_BLURBS[card.season],
      details: showDetails ? details : null,
      name: showName ? profile.display_name.split(' ')[0] ?? null : null,
    }, format)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreview({ blob, url });
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : 'Mira couldn’t draw your card.'));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [card, format, showDetails, showName, profile.display_name, minor]);

  async function share() {
    if (!preview || !card?.season) return;
    setBusy(true);
    setError(null);
    try {
      const shared = await shareImage(`aura-card-${format}.png`, preview.blob, `My colors: ${SEASON_NAMES[card.season]}`);
      if (shared) track(profile, 'card_shared', { format });
    } catch {
      setError('Sharing didn’t work on this device. Try again, or take a screenshot of the preview.');
    } finally {
      setBusy(false);
    }
  }

  if (minor) {
    return (
      <Screen centered footer={<Button fullWidth onClick={() => navigate('/mirror/card')}>Back to my card</Button>}>
        <Mira expression="shy" size="lg" />
        <h1 className="mt-6 font-display text-h2 font-semibold">Sharing is off for now</h1>
        <p className="mt-2 text-body text-cocoa-soft">AURA keeps sharing turned off for accounts under 18. Your card is still all yours to see here.</p>
      </Screen>
    );
  }

  if (state.status !== 'ready' || !card?.season) {
    return (
      <Screen centered footer={<Button fullWidth onClick={() => navigate('/mirror/card')}>Back to my card</Button>}>
        {state.status === 'loading' ? (
          <p role="status" className="font-mira text-h3 text-cocoa-soft">fetching your card…</p>
        ) : (
          <>
            <Mira expression="thinking" size="lg" />
            <h1 className="mt-6 font-display text-h2 font-semibold">Finish your colors first</h1>
            <p className="mt-2 text-body text-cocoa-soft">The share card shows your season and palette, so it needs those on your Aura Card.</p>
          </>
        )}
      </Screen>
    );
  }

  return (
    <Screen footer={<Button fullWidth disabled={!preview || busy} onClick={() => void share()}>{busy ? 'Opening…' : 'Share'}</Button>}>
      <ScreenHeader title="Share your card" backTo="/mirror/card" />
      <div className="flex gap-2">
        {(Object.keys(FORMATS) as ShareFormat[]).map((f) => (
          <Chip key={f} selected={format === f} onClick={() => setFormat(f)}>{FORMATS[f].label}</Chip>
        ))}
      </div>

      <div className="mt-4 flex justify-center rounded-md bg-sand p-4">
        {preview ? (
          <img src={preview.url} alt={`Preview: ${SEASON_NAMES[card.season]} Aura Card`}
            className={cx('rounded-sm shadow-soft', format === 'story' ? 'h-96' : 'w-full max-w-72')} />
        ) : (
          <p role="status" className={cx('flex items-center font-mira text-h3 text-cocoa-soft', format === 'story' ? 'h-96' : 'h-72')}>drawing your card…</p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 rounded-md bg-paper p-4 shadow-soft">
          <span className="text-body">Show face shape and undertone</span>
          <Toggle label="Show face shape and undertone" checked={showDetails} onChange={setShowDetails} />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md bg-paper p-4 shadow-soft">
          <span className="text-body">Show my first name</span>
          <Toggle label="Show my first name" checked={showName} onChange={setShowName} />
        </div>
      </div>
      <p className="mt-4 text-caption text-cocoa-soft">
        The card is drawn on your phone from your results. It never includes your selfie or a link to your account,
        so friends who like it can find AURA and take their own scan.
      </p>
      {error && <div className="mt-3"><FormAlert message={error} /></div>}
    </Screen>
  );
}
