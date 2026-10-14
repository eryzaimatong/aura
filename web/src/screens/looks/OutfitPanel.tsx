import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Mira } from '../../components/Mira';
import { FormAlert } from '../onboarding/FormAlert';
import type { ClosetState } from '../closet/useCloset';
import { OutfitCollage } from './OutfitCollage';
import type { OutfitState } from './useOutfit';

const MISSING_COPY: Record<string, string> = {
  bottom: 'Add a bottom — jeans, a skirt, trousers — and Mira can start pairing.',
  top: 'Add a top and Mira can start pairing.',
};

/** Outfit + "why" card, with honest loading, gap and error states. Hard rule 7: no reason, no render. */
export function OutfitPanel({ outfit, closet, whyTitle, onRetry }: {
  outfit: OutfitState;
  closet: ClosetState;
  whyTitle: string;
  onRetry: () => void;
}) {
  const navigate = useNavigate();

  if (outfit.status === 'need_items') {
    return (
      <Card tone="lilac" flat className="flex flex-col items-center gap-3 p-6 text-center">
        <Mira expression="closet-pick" size="md" />
        <p className="text-body font-bold">Mira needs a few more pieces</p>
        <p className="text-caption text-cocoa-soft">{MISSING_COPY[outfit.missing] ?? 'Add a dress, or a top and a bottom, to get outfits.'}</p>
        <Button size="sm" onClick={() => navigate('/closet/add')}>Add clothes</Button>
      </Card>
    );
  }
  if (outfit.status === 'error' || closet.status === 'error') {
    return (
      <div className="flex flex-col gap-3">
        <FormAlert message={outfit.status === 'error' ? outfit.message : 'Mira couldn’t open your closet.'} />
        <Button variant="ghost" onClick={onRetry}>Try again</Button>
      </div>
    );
  }
  if (outfit.status === 'loading' || closet.status === 'loading' || !outfit.outfit.reason) {
    return (
      <Card className="flex min-h-64 flex-col items-center justify-center gap-2">
        <Mira expression="thinking" size="md" className="animate-pulse" />
        <p role="status" className="font-mira text-h3 text-cocoa-soft">putting a look together…</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <OutfitCollage outfit={outfit.outfit} items={closet.items} urls={closet.urls} />
      <div>
        <p className="text-label font-bold">{whyTitle}</p>
        <p className="mt-1 text-caption text-cocoa-soft">{outfit.outfit.reason}</p>
      </div>
    </Card>
  );
}
