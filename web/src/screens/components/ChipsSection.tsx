import { useState } from 'react';
import { Chip } from '../../components/Chip';
import { GallerySection, StateLabel } from './GallerySection';

const FILTERS = ['All', 'Tops', 'Bottoms', 'In palette', 'Outerwear'] as const;
const VEINS = ['Blue', 'Green', 'Both'] as const;

export function ChipsSection() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [veins, setVeins] = useState<(typeof VEINS)[number] | null>(null);

  return (
    <GallerySection title="Chip" note="Tap to toggle. Selected chips fill lilac.">
      <StateLabel>states</StateLabel>
      <div className="flex flex-wrap gap-2">
        <Chip>Unselected</Chip>
        <Chip selected>Selected</Chip>
        <Chip disabled>Disabled</Chip>
      </div>
      <StateLabel>single-select filter row (scrolls sideways)</StateLabel>
      <div className="-mx-gutter flex gap-2 overflow-x-auto px-gutter pb-1">
        {FILTERS.map((f) => (
          <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Chip>
        ))}
      </div>
      <StateLabel>quiz answer (tap again to clear)</StateLabel>
      <div className="flex flex-wrap gap-2">
        {VEINS.map((v) => (
          <Chip key={v} selected={veins === v} onClick={() => setVeins(veins === v ? null : v)}>
            {v}
          </Chip>
        ))}
      </div>
    </GallerySection>
  );
}
