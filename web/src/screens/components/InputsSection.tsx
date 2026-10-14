import { useState } from 'react';
import { Input } from '../../components/Input';
import { GallerySection } from './GallerySection';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InputsSection() {
  const [email, setEmail] = useState('eryza@');
  const emailError = EMAIL_RE.test(email) ? undefined : 'That email looks incomplete.';

  return (
    <GallerySection title="Input" note="Default, focus (tap a field for the gold border), error, plus hint and disabled.">
      <Input label="Name" placeholder="Your first name" />
      <Input label="Waist" inputMode="decimal" placeholder="cm" hint="Measure at the narrowest point." />
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={emailError} />
      <Input label="Region" value="Philippines" disabled readOnly />
    </GallerySection>
  );
}
