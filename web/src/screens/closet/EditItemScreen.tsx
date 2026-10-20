import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { authErrorMessage } from '../../lib/authErrors';
import { CATEGORIES, CATEGORY_LABEL, SEASONALITY_LABEL, SUBCATEGORIES } from '../../lib/closet/labels';
import type { ItemCategory, Seasonality } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { FormAlert } from '../onboarding/FormAlert';
import { SplashScreen } from '../SplashScreen';
import { ItemPhoto } from './ItemPhoto';
import { useCloset } from './useCloset';

/** Fix what Mira got wrong: name, type, kind and weather. Feeds straight into outfits. */
export function EditItemScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useCloset();
  const item = state.status === 'ready' ? state.items.find((i) => i.id === id) : undefined;
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('top');
  const [sub, setSub] = useState<string | null>(null);
  const [season, setSeason] = useState<Seasonality | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setCategory(item.category);
    setSub(item.subcategory);
    setSeason(item.seasonality);
  }, [item]);

  if (state.status === 'loading') return <SplashScreen />;
  if (state.status === 'error' || !item) return <Navigate to="/closet" replace />;

  const nameError = name.trim() ? undefined : 'Give it a name.';

  async function save() {
    if (nameError) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('closet_items').update({
      name: name.trim(), category, subcategory: sub, seasonality: season,
    }).eq('id', item!.id);
    setSaving(false);
    if (err) return setError(authErrorMessage(err));
    navigate(`/closet/item/${item!.id}`, { replace: true });
  }

  function pickCategory(c: ItemCategory) {
    setCategory(c);
    // A kind from another category would contradict the type.
    if (!SUBCATEGORIES[c].some((s) => s.key === sub)) setSub(null);
  }

  return (
    <Screen footer={<Button fullWidth disabled={saving || !!nameError} onClick={() => void save()}>{saving ? 'Saving…' : 'Save changes'}</Button>}>
      <ScreenHeader title="Edit item" backTo={`/closet/item/${item.id}`} />
      <div className="flex items-center gap-4">
        <ItemPhoto src={state.urls.get(item.image_path)} alt="" className="size-20 shrink-0" />
        <p className="text-caption text-cocoa-soft">Mira tagged this from the photo. Fix anything that’s off and outfits will use your version.</p>
      </div>

      <Input className="mt-6" label="Name" value={name} maxLength={60} error={nameError} onChange={(e) => setName(e.target.value)} />

      <fieldset className="mt-5">
        <legend className="text-label font-bold">Type</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => <Chip key={c} selected={category === c} onClick={() => pickCategory(c)}>{CATEGORY_LABEL[c]}</Chip>)}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-label font-bold">Kind</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {SUBCATEGORIES[category].map((s) => (
            <Chip key={s.key} selected={sub === s.key} onClick={() => setSub(sub === s.key ? null : s.key)}>{s.label}</Chip>
          ))}
        </div>
        {category === 'shoes' && <p className="mt-2 text-caption text-cocoa-soft">Mira picks closed shoes on rainy days, so this one matters.</p>}
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-label font-bold">Best for</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(SEASONALITY_LABEL) as Seasonality[]).map((s) => (
            <Chip key={s} selected={season === s} onClick={() => setSeason(s)}>{SEASONALITY_LABEL[s]}</Chip>
          ))}
        </div>
      </fieldset>
      {error && <div className="mt-4"><FormAlert message={error} /></div>}
    </Screen>
  );
}
