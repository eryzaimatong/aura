import { useState } from 'react';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Input } from '../../components/Input';
import { cx } from '../../lib/cx';
import type { DeleteScope } from '../../lib/database.types';

const SCOPES: ReadonlyArray<{ value: DeleteScope; label: string; removes: string }> = [
  { value: 'scans', label: 'Scan data only', removes: 'Your Aura Card, every scan’s measurements, quiz answers, corrections and the Vanity picks made from them.' },
  { value: 'closet', label: 'Closet', removes: 'Every closet item and photo, your looks and your whole wear log.' },
  { value: 'all', label: 'Everything', removes: 'Your whole account: all of the above, your consents and your login. You’ll be signed out.' },
];

/** Hard rule 5: real deletion, scoped, always confirmed — "Everything" needs the word DELETE. */
export function DeleteCard({ scope, onScope, onConfirm, busy, className }: {
  scope: DeleteScope | null;
  onScope: (s: DeleteScope | null) => void;
  onConfirm: (s: DeleteScope) => void;
  busy: boolean;
  className?: string;
}) {
  const [typed, setTyped] = useState('');
  const chosen = SCOPES.find((s) => s.value === scope);
  const ready = scope !== null && (scope !== 'all' || typed.trim().toUpperCase() === 'DELETE');

  return (
    <section className={cx('rounded-md border-2 border-coral bg-paper p-4', className)} aria-labelledby="delete-title">
      <h2 id="delete-title" className="text-body font-bold text-danger">Delete</h2>
      <p className="mt-1 text-caption text-cocoa-soft">Deletion is immediate and can’t be undone.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SCOPES.map((s) => (
          <Chip key={s.value} selected={scope === s.value} onClick={() => { setTyped(''); onScope(scope === s.value ? null : s.value); }}>
            {s.label}
          </Chip>
        ))}
      </div>

      {chosen && (
        <div className="mt-4 flex flex-col gap-3 rounded-sm bg-tint-pink p-3">
          <p className="text-caption text-cocoa"><span className="font-bold">This deletes:</span> {chosen.removes}</p>
          {scope === 'all' && (
            <Input label="Type DELETE to confirm" value={typed} autoComplete="off" autoCapitalize="characters"
              onChange={(e) => setTyped(e.target.value)} />
          )}
          <Button variant="danger" fullWidth disabled={!ready || busy} onClick={() => scope && onConfirm(scope)}>
            {busy ? 'Deleting…' : `Delete ${chosen.label.toLowerCase()}`}
          </Button>
        </div>
      )}
    </section>
  );
}
