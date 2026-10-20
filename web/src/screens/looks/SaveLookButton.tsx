import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../components/Button';
import { apiErrorMessage } from '../../lib/apiErrors';
import { FormAlert } from '../onboarding/FormAlert';

/** "Save look" under an outfit. `outfitKey` resets it when a new outfit is shown. */
export function SaveLookButton({ save, outfitKey }: { save: () => Promise<unknown>; outfitKey: string }) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | { error: string }>('idle');
  useEffect(() => setState('idle'), [outfitKey]);

  async function onSave() {
    setState('saving');
    try {
      await save();
      setState('saved');
    } catch (err) {
      setState({ error: apiErrorMessage(err) });
    }
  }

  return (
    <>
      <Button variant="ghost" fullWidth className="mt-2" disabled={state === 'saving' || state === 'saved'}
        icon={state === 'saved' ? <BookmarkCheck size={18} /> : <Bookmark size={18} />} onClick={() => void onSave()}>
        {state === 'saved' ? 'Saved' : state === 'saving' ? 'Saving…' : 'Save look'}
      </Button>
      {state === 'saved' && (
        <p role="status" className="text-center text-label text-success">
          In your Saved looks ✦ <Link to="/looks/saved" className="font-bold underline">See them</Link>
        </p>
      )}
      {typeof state === 'object' && <div className="mt-2"><FormAlert message={state.error} /></div>}
    </>
  );
}
