import { useCallback, useEffect, useRef, useState } from 'react';
import { useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import { starterKeys, TEMPLATES, type Context, type GoalRow, type GoalState } from '../../lib/roadmap';
import { supabase } from '../../lib/supabase';

export type GoalsState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; goals: GoalRow[] };

/** The user's goals (dropped ones hidden). A first visit seeds a starter roadmap from `ctx`. */
export function useGoals(ctx: Context | null) {
  const profile = useProfile();
  const [state, setState] = useState<GoalsState>({ status: 'loading' });
  const seeded = useRef(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('goals').select('*').eq('user_id', profile.id).order('sort_order');
    if (error) throw error;
    return data;
  }, [profile.id]);

  useEffect(() => {
    if (!ctx) return;
    let cancelled = false;
    (async () => {
      let goals = await load();
      if (goals.length === 0 && !seeded.current) {
        seeded.current = true; // once per mount, even under StrictMode's double effects
        const keys = starterKeys(ctx);
        const { error } = await supabase.from('goals').insert(keys.map((k, i) => ({
          user_id: profile.id, title: TEMPLATES[k]!.title, detail: `tpl:${k}`, state: (i === 0 ? 'now' : 'later') as GoalState, sort_order: i,
        })));
        if (error) throw error;
        goals = await load();
      }
      if (!cancelled) setState({ status: 'ready', goals: goals.filter((g) => g.state !== 'dropped') });
    })().catch((err: unknown) => !cancelled && setState({ status: 'error', message: authErrorMessage(err) }));
    return () => { cancelled = true; };
  }, [ctx, load, profile.id]);

  const setGoalState = useCallback(async (id: string, next: GoalState) => {
    const patch = { state: next, completed_at: next === 'done' ? new Date().toISOString() : null };
    const { error } = await supabase.from('goals').update(patch).eq('id', id);
    if (error) throw error;
    setState((s) => s.status !== 'ready' ? s : {
      status: 'ready',
      goals: s.goals
        .map((g) => (g.id === id ? { ...g, ...patch } : next === 'now' && g.state === 'now' ? { ...g, state: 'next' as GoalState } : g))
        .filter((g) => g.state !== 'dropped'),
    });
    // Only one focus at a time: demote any other "now" goal.
    if (next === 'now') await supabase.from('goals').update({ state: 'next' }).eq('user_id', profile.id).eq('state', 'now').neq('id', id);
  }, [profile.id]);

  return { state, setGoalState };
}
