import { useState } from 'react';
import { MIRA_EXPRESSIONS, Mira } from '../../components/Mira';
import { NavBar, type Room } from '../../components/NavBar';
import { GallerySection, StateLabel } from './GallerySection';

export function NavSection() {
  const [room, setRoom] = useState<Room>('closet');
  return (
    <GallerySection title="NavBar" note={`Tap a room. Active: ${room}.`}>
      <NavBar active={room} onSelect={setRoom} />
    </GallerySection>
  );
}

export function MiraSection() {
  return (
    <GallerySection title="Mira" note="Reads /public/mira/<expression>.png. A lilac placeholder shows until the file exists.">
      <div className="grid grid-cols-3 gap-4">
        {MIRA_EXPRESSIONS.map((e) => (
          <figure key={e} className="flex flex-col items-center gap-1">
            <Mira expression={e} size="md" />
            <figcaption className="text-caption text-muted">{e}</figcaption>
          </figure>
        ))}
      </div>
      <StateLabel>sizes: sm · md · lg · xl</StateLabel>
      <div className="flex items-end gap-2">
        <Mira expression="hello" size="sm" />
        <Mira expression="hello" size="md" />
        <Mira expression="hello" size="lg" />
      </div>
      <Mira expression="hello" size="xl" label="Mira waving hello" />
    </GallerySection>
  );
}
