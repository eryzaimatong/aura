import { useEffect, useRef, useState } from 'react';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useProfile } from '../../lib/auth/context';
import { countItems, saveItem } from '../../lib/closet/data';
import { PhotoError, processGarmentPhoto } from '../../lib/closet/process';
import { PhotoDrop } from './PhotoDrop';
import { toNewItem } from './toNewItem';

const GOAL = 15;
const SECONDS_PER_ITEM = 12; // photo + review, for the "about N min left" hint

type Tile = { key: string; file: File; status: 'waiting' | 'working' | 'saved' | 'failed'; preview?: string; name?: string; error?: string };

export function QuickStartScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const [existing, setExisting] = useState<number | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const running = useRef(false);
  const previews = useRef<string[]>([]);

  useEffect(() => {
    countItems(profile.id).then(setExisting).catch(() => setExisting(0));
  }, [profile.id]);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const update = (key: string, patch: Partial<Tile>) => setTiles((ts) => ts.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  // One photo at a time: the tagger is the slow part, and order keeps the grid calm.
  useEffect(() => {
    const next = tiles.find((t) => t.status === 'waiting');
    if (!next || running.current) return;
    running.current = true;
    update(next.key, { status: 'working' });
    (async () => {
      try {
        const photo = await processGarmentPhoto(next.file);
        if (!photo.tags) throw new PhotoError('Mira can’t tag right now — add this one from “Add item”.');
        await saveItem(profile.id, photo.image, toNewItem(photo.tags, photo.tags.suggested_name, photo.tags.category));
        const preview = URL.createObjectURL(photo.image);
        previews.current.push(preview);
        update(next.key, { status: 'saved', preview, name: photo.tags.suggested_name });
      } catch (err) {
        update(next.key, { status: 'failed', error: err instanceof PhotoError ? err.message : 'Couldn’t add this one.' });
      } finally {
        running.current = false;
        setTiles((ts) => [...ts]); // nudge the effect to pick up the next photo
      }
    })();
  }, [tiles, profile.id]);

  const added = (existing ?? 0) + tiles.filter((t) => t.status === 'saved').length;
  const left = Math.max(0, GOAL - added);

  return (
    <Screen
      footer={
        <>
          <Button fullWidth onClick={() => navigate('/closet')}>See my closet</Button>
          <Button variant="ghost" fullWidth onClick={() => navigate('/')}>Finish later</Button>
        </>
      }
    >
      <ScreenHeader title="Add your top 15" backTo="/closet" />
      <div className="flex justify-between text-label">
        <span className="text-cocoa-soft">{Math.min(added, GOAL)} of {GOAL} added</span>
        {left > 0 && <span className="font-bold text-gold-deep">about {Math.max(1, Math.round((left * SECONDS_PER_ITEM) / 60))} min left</span>}
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-track" role="progressbar" aria-valuemin={0} aria-valuemax={GOAL} aria-valuenow={added}>
        <div className="h-full rounded-pill bg-gold transition-[width]" style={{ width: `${Math.min(100, (added / GOAL) * 100)}%` }} />
      </div>
      <p className="mt-3 text-body text-cocoa-soft">Skip the full closet. Add only what you actually reach for, and the outfit generator starts working.</p>

      <PhotoDrop className="mt-4 min-h-36" multiple title="Batch capture" subtitle="Pick several photos — Mira cuts out and tags each one"
        onFiles={(files) => setTiles((ts) => [...ts, ...files.map((file) => ({ key: crypto.randomUUID(), file, status: 'waiting' as const }))])} />

      {tiles.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-3">
          {tiles.map((t) => (
            <li key={t.key} title={t.error ?? t.name} className="flex aspect-square flex-col items-center justify-center overflow-hidden rounded-md bg-tint-lilac p-1 text-center">
              {t.status === 'saved' && t.preview && <img src={t.preview} alt={t.name ?? ''} className="size-full object-contain" />}
              {(t.status === 'waiting' || t.status === 'working') && (
                <LoaderCircle aria-label={t.status === 'working' ? 'Tagging' : 'Waiting'} className={t.status === 'working' ? 'animate-spin text-gold-deep' : 'text-lilac'} />
              )}
              {t.status === 'failed' && (
                <>
                  <CircleAlert aria-hidden="true" size={18} className="text-danger" />
                  <span className="mt-1 text-micro text-danger">{t.error}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <Card tone="sand" flat className="mt-4">
        <p className="text-label font-bold">Faster ways <span className="font-normal text-cocoa-soft">· coming soon</span></p>
        <ul className="mt-2 flex flex-col gap-1 text-caption text-cocoa-soft">
          <li>Import from a shopping screenshot</li>
          <li>Forward an order confirmation email</li>
        </ul>
      </Card>
    </Screen>
  );
}
