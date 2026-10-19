import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Checkbox } from '../../components/Checkbox';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import { isBodyGoal, templateKey, TEMPLATES } from '../../lib/roadmap';
import { supabase } from '../../lib/supabase';
import { FormAlert } from '../onboarding/FormAlert';

export function AddGoalScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const [taken, setTaken] = useState<Set<string> | null>(null);
  const [maxOrder, setMaxOrder] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [own, setOwn] = useState('');
  const [ownError, setOwnError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('goals').select('detail, state, sort_order').eq('user_id', profile.id).then(({ data }) => {
      const active = (data ?? []).filter((g) => g.state !== 'dropped');
      setTaken(new Set(active.map((g) => templateKey(g)).filter((k): k is string => k !== null)));
      setMaxOrder(Math.max(0, ...(data ?? []).map((g) => g.sort_order)));
    });
  }, [profile.id]);

  const available = Object.entries(TEMPLATES).filter(([k]) => taken && !taken.has(k));

  async function add() {
    const text = own.trim();
    if (text && isBodyGoal(text)) return setOwnError('Goals here are about style, never about your body. Try something to wear, find or try.');
    if (text.length > 120) return setOwnError('Keep it under 120 characters.');
    const rows = [
      ...[...picked].map((k) => ({ title: TEMPLATES[k]!.title, detail: `tpl:${k}` })),
      ...(text ? [{ title: text, detail: null }] : []),
    ].map((r, i) => ({ ...r, user_id: profile.id, state: 'later' as const, sort_order: maxOrder + 1 + i }));
    if (rows.length === 0) return;
    setSaving(true);
    const { error: err } = await supabase.from('goals').insert(rows);
    setSaving(false);
    if (err) return setError(authErrorMessage(err));
    navigate('/profile/roadmap', { replace: true });
  }

  return (
    <Screen footer={<Button fullWidth disabled={saving || (picked.size === 0 && !own.trim())} onClick={() => void add()}>
      {saving ? 'Adding…' : 'Add to roadmap'}
    </Button>}>
      <ScreenHeader title="Add a goal" backTo="/profile/roadmap" />
      {available.length > 0 && <p className="text-label font-bold">Pick a starting point</p>}
      <div className="mt-3 flex flex-col gap-3">
        {available.map(([k, t]) => (
          <Checkbox key={k} surface="paper" checked={picked.has(k)}
            onChange={(on) => setPicked((s) => { const n = new Set(s); if (on) n.add(k); else n.delete(k); return n; })}>
            <span className="block">{t.title}</span>
            <span className="block text-caption text-cocoa-soft">{t.hint}</span>
          </Checkbox>
        ))}
      </div>

      <Input className="mt-6" label="Or write your own" placeholder="e.g. find an everyday bag in my palette" maxLength={120}
        value={own} error={ownError} onChange={(e) => { setOwn(e.target.value); setOwnError(undefined); }} />
      <p className="mt-3 font-mira text-h3 text-cocoa-soft">Goals are about style, never about your body.</p>
      {error && <div className="mt-3"><FormAlert message={error} /></div>}
    </Screen>
  );
}
