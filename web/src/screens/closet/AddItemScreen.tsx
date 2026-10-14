import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Input } from '../../components/Input';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useProfile } from '../../lib/auth/context';
import { track } from '../../lib/analytics';
import { authErrorMessage } from '../../lib/authErrors';
import { saveItem } from '../../lib/closet/data';
import { CATEGORIES, CATEGORY_LABEL, capitalize } from '../../lib/closet/labels';
import { PhotoError, processGarmentPhoto, type ProcessedPhoto } from '../../lib/closet/process';
import type { ItemCategory } from '../../lib/database.types';
import { FormAlert } from '../onboarding/FormAlert';
import { PhotoDrop } from './PhotoDrop';
import { toNewItem } from './toNewItem';

type Phase = 'pick' | 'processing' | 'review' | 'saving';

export function AddItemScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const [phase, setPhase] = useState<Phase>('pick');
  const [photo, setPhoto] = useState<ProcessedPhoto | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => (photo ? URL.createObjectURL(photo.image) : null), [photo]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function handleFile(file: File) {
    setError(null);
    setPhase('processing');
    try {
      const result = await processGarmentPhoto(file);
      setPhoto(result);
      setName(result.tags?.suggested_name ?? '');
      setCategory(result.tags?.category ?? null);
      setPhase('review');
    } catch (err) {
      setError(err instanceof PhotoError ? err.message : authErrorMessage(err));
      setPhase('pick');
    }
  }

  async function save() {
    if (!photo || !category || !name.trim()) return;
    setPhase('saving');
    setError(null);
    try {
      const item = await saveItem(profile.id, photo.image, toNewItem(photo.tags, name.trim(), category));
      track(profile, 'item_added', { category, auto_tagged: photo.tags !== null, source: 'single' });
      navigate(`/closet/item/${item.id}`, { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
      setPhase('review');
    }
  }

  const tags = photo?.tags;
  const busy = phase === 'processing' || phase === 'saving';

  return (
    <Screen
      footer={
        <Button fullWidth disabled={phase !== 'review' || !category || !name.trim()} onClick={() => void save()}>
          {phase === 'saving' ? 'Saving…' : 'Save to closet'}
        </Button>
      }
    >
      <ScreenHeader title="Add to closet" backTo="/closet" />

      <PhotoDrop className="aspect-square" title="Photograph the item" subtitle="One piece, laid flat or hung up"
        onFiles={([f]) => f && void handleFile(f)} disabled={busy}>
        {phase === 'processing' ? (
          <div role="status" className="flex flex-col items-center gap-2">
            <Mira expression="thinking" size="md" className="animate-pulse" />
            <span className="font-mira text-h3 text-cocoa-soft">cutting it out…</span>
          </div>
        ) : preview ? (
          <img src={preview} alt="Your item" className="size-full object-contain" />
        ) : undefined}
      </PhotoDrop>
      {preview && phase === 'review' && <p className="mt-2 text-center text-caption text-cocoa-soft">Tap the photo to replace it.</p>}

      {error && <div className="mt-4"><FormAlert message={error} /></div>}

      {phase !== 'pick' && phase !== 'processing' && (
        <>
          {tags ? (
            <section className="mt-4" aria-label="Mira detected">
              <p className="text-label font-bold">Mira detected</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-pill bg-lilac px-4 py-2 text-label">{tags.subcategory_label}</span>
                {tags.color_name && <span className="rounded-pill bg-lilac px-4 py-2 text-label">{capitalize(tags.color_name)}</span>}
                {tags.in_palette && <span className="rounded-pill bg-lilac px-4 py-2 text-label">In your palette</span>}
              </div>
              {tags.palette_reason && <p className="mt-2 text-caption text-cocoa-soft">{tags.palette_reason}</p>}
              {!tags.cutout_ok && <p className="mt-2 text-caption text-cocoa-soft">Mira couldn’t separate it from the background, so the whole photo is kept.</p>}
            </section>
          ) : (
            <p className="mt-4 rounded-md bg-sand p-3 text-caption text-cocoa-soft">Mira can’t tag photos right now, so pick the type yourself.</p>
          )}

          <p className="mt-4 text-label font-bold">Type</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>{CATEGORY_LABEL[c]}</Chip>)}
          </div>
          <Input className="mt-4" label="Name" value={name} maxLength={60} placeholder="e.g. Cream linen blazer"
            onChange={(e) => setName(e.target.value)} />
        </>
      )}
    </Screen>
  );
}
