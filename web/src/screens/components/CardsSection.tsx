import { Card, type CardTone } from '../../components/Card';
import { Mira } from '../../components/Mira';
import { GallerySection, StateLabel } from './GallerySection';

const TINTS: CardTone[] = ['sand', 'lilac', 'sage', 'peach', 'blue', 'pink'];

export function CardsSection() {
  return (
    <GallerySection title="Card" note="Paper by default, optional gold emphasis, tint tones, opal.">
      <Card>
        <p className="font-bold">Analyzed on your phone</p>
        <p className="text-caption text-cocoa-soft">The photo never leaves your device.</p>
      </Card>
      <Card emphasis>
        <p className="font-bold">Emphasis</p>
        <p className="text-caption text-cocoa-soft">2px gold outline.</p>
      </Card>
      <Card tone="lilac" flat className="flex items-center gap-3">
        <Mira expression="found-it" size="sm" />
        <div>
          <p className="font-mira text-h3 text-cocoa-soft">found something for you</p>
          <p className="text-caption text-cocoa-soft">Mira tip card: tint, flat.</p>
        </div>
      </Card>
      <Card tone="opal" className="p-6">
        <p className="text-micro font-bold uppercase tracking-wide text-muted">Your season</p>
        <p className="font-display text-h2">Soft Summer</p>
      </Card>
      <StateLabel>tones</StateLabel>
      <div className="grid grid-cols-3 gap-2">
        {TINTS.map((tone) => (
          <Card key={tone} tone={tone} flat className="text-center text-caption">
            {tone}
          </Card>
        ))}
      </div>
    </GallerySection>
  );
}
