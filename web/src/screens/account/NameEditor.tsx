import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { useAuth } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import { validateName } from '../onboarding/validation';

/** Inline name edit inside the Settings list. */
export function NameEditor({ initial, onDone }: { initial: string; onDone: () => void }) {
  const { updateProfile } = useAuth();
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const problem = validateName(name);
    if (problem) return setError(problem);
    setSaving(true);
    try {
      await updateProfile({ display_name: name.trim() });
      onDone();
    } catch (err) {
      setError(authErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={(e) => void save(e)} className="flex flex-col gap-3" noValidate>
        <Input label="Name" value={name} maxLength={50} autoFocus error={error} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
          <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Card>
  );
}
