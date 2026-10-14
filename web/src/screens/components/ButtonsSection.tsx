import { Camera, Heart, Trash2 } from 'lucide-react';
import { Button, type ButtonVariant } from '../../components/Button';
import { GallerySection, StateLabel } from './GallerySection';

const VARIANTS: ButtonVariant[] = ['primary', 'ghost', 'outline', 'danger'];

export function ButtonsSection() {
  return (
    <GallerySection title="Button" note="4 variants × 2 sizes, optional icon, disabled.">
      {VARIANTS.map((variant) => (
        <div key={variant} className="flex flex-col gap-2">
          <StateLabel>{variant}</StateLabel>
          <Button variant={variant} fullWidth>
            {variant === 'danger' ? 'Delete my scans' : 'Agree and continue'}
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant={variant} size="sm" icon={variant === 'danger' ? <Trash2 size={16} /> : <Heart size={16} />}>
              With icon
            </Button>
            <Button variant={variant} size="sm">
              Small
            </Button>
            <Button variant={variant} size="sm" disabled>
              Disabled
            </Button>
          </div>
        </div>
      ))}
      <StateLabel>icon + full width</StateLabel>
      <Button icon={<Camera size={18} />} fullWidth>
        Retake in better light
      </Button>
    </GallerySection>
  );
}
