import { useNavigate } from 'react-router';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import type { AuraCardRow } from '../../../lib/database.types';
import { FACE_SHAPE_NAMES, SEASON_BLURBS, SEASON_NAMES, UNDERTONE_NAMES } from '../../../lib/seasons';

/** The opal card itself: season, shape · undertone, palette dots, one-line "what suits you". */
export function AuraCardFace({ card }: { card: AuraCardRow }) {
  const navigate = useNavigate();
  const shape = `${FACE_SHAPE_NAMES[card.face_shape]} face`;
  const undertone = card.skin_undertone ? ` · ${UNDERTONE_NAMES[card.skin_undertone]} undertone` : '';

  return (
    <Card tone="opal" emphasis className="p-6">
      <p className="text-micro font-bold uppercase tracking-wide text-cocoa">Your Aura Card</p>
      <h2 className="mt-3 font-display text-h1 font-semibold">{card.season ? SEASON_NAMES[card.season] : 'Colors to finish'}</h2>
      <p className="mt-1 text-body text-cocoa-soft">
        {shape}
        {undertone}
      </p>

      {card.season ? (
        <>
          <ul className="mt-4 flex gap-3" aria-label="Your palette">
            {card.palette.map((hex) => (
              <li
                key={hex}
                title={hex}
                // Palette colours are data from the card, not design tokens.
                style={{ backgroundColor: hex }}
                className="size-12 rounded-pill border-2 border-paper shadow-soft"
              />
            ))}
          </ul>
          <p className="mt-4 text-label text-cocoa-soft">{SEASON_BLURBS[card.season]}</p>
        </>
      ) : (
        <>
          <p className="mt-4 text-label text-cocoa-soft">
            The light was tricky, so Mira left your colors blank instead of guessing.
          </p>
          <Button size="sm" className="mt-4" onClick={() => navigate('/mirror/quiz')}>
            Finish my colors
          </Button>
        </>
      )}
    </Card>
  );
}
