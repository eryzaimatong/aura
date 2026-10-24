import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { authErrorMessage } from '../../lib/authErrors';
import { cx } from '../../lib/cx';
import { progressFor, type Context, type GoalRow, type GoalState } from '../../lib/roadmap';
import { FormAlert } from '../onboarding/FormAlert';
import { useCloset } from '../closet/useCloset';
import { useCurrentCard } from '../mirror/useCurrentCard';
import { useGoals } from './useGoals';

const ORDER: Record<GoalState, number> = { done: 0, now: 1, next: 2, later: 3, dropped: 4 };

function startedAgo(goals: GoalRow[]): string {
  const first = goals.reduce<string | null>((m, g) => (!m || g.created_at < m ? g.created_at : m), null);
  if (!first) return '';
  const days = Math.floor((Date.now() - new Date(first).getTime()) / 86_400_000);
  return days < 1 ? 'started today' : days < 14 ? `started ${days} day${days === 1 ? '' : 's'} ago` : `started ${Math.round(days / 7)} weeks ago`;
}

export function RoadmapScreen() {
  const navigate = useNavigate();
  const { state: closet } = useCloset();
  const { state: card } = useCurrentCard();
  const ctx = useMemo<Context | null>(() =>
    closet.status === 'ready' && card.status !== 'loading'
      ? { items: closet.items, log: closet.log, card: card.status === 'ready' ? card.card : null }
      : null, [closet, card]);
  const { state, setGoalState } = useGoals(ctx);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function change(id: string, next: GoalState) {
    setError(null);
    try {
      await setGoalState(id, next);
      setOpen(null);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

  const goals = state.status === 'ready' ? [...state.goals].sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.sort_order - b.sort_order) : [];
  const done = goals.filter((g) => g.state === 'done').length;
  const pct = goals.length ? Math.round((done / goals.length) * 100) : 0;

  return (
    <Screen footer={<Button fullWidth onClick={() => navigate('/profile/roadmap/add')}>Add a goal</Button>}>
      <ScreenHeader title="Glow-up roadmap" backTo="/profile" />
      {state.status === 'loading' && <p role="status" className="mt-8 text-center font-mira text-h3 text-cocoa-soft">mapping your next steps…</p>}
      {state.status === 'error' && <FormAlert message={state.message} />}

      {state.status === 'ready' && (
        <>
          <div className="flex items-center justify-between rounded-md bg-gold p-5 shadow-soft">
            <div>
              <p className="font-display text-h3 font-semibold">{done} of {goals.length} done</p>
              <p className="text-caption text-cocoa">{startedAgo(goals)}</p>
            </div>
            <p className="font-display text-h2 font-semibold">{pct}%</p>
          </div>
          {error && <div className="mt-3"><FormAlert message={error} /></div>}

          <ul className="mt-4 flex flex-col gap-3">
            {goals.map((g) => {
              const p = ctx ? progressFor(g, ctx) : null;
              const isOpen = open === g.id;
              return (
                <li key={g.id}>
                  <Card className="flex flex-col gap-3">
                    <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : g.id)}
                      className="flex w-full items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep">
                      <span aria-hidden="true" className={cx('flex size-7 shrink-0 items-center justify-center rounded-pill',
                        g.state === 'done' ? 'bg-sage text-cocoa' : g.state === 'now' ? 'bg-gold' : 'bg-sand')}>
                        {g.state === 'done' && <Check size={16} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cx('block text-body', g.state === 'later' || g.state === 'next' ? 'text-cocoa-soft' : 'text-cocoa')}>{g.title}</span>
                        {(p || (!g.detail?.startsWith('tpl:') && g.detail)) && (
                          <span className="block text-caption text-cocoa-soft">{p ? p.subtitle : g.detail}</span>
                        )}
                      </span>
                      {g.state === 'now' && <span className="text-label font-bold text-cocoa">now</span>}
                      {g.state !== 'done' && p?.met && <span className="text-micro font-bold text-success">ready to tick off</span>}
                    </button>
                    {isOpen && (
                      <div className="flex flex-wrap gap-2">
                        {g.state !== 'done' && <Button size="sm" onClick={() => void change(g.id, 'done')}>Mark done</Button>}
                        {g.state === 'done' && <Button size="sm" variant="outline" onClick={() => void change(g.id, 'later')}>Not done yet</Button>}
                        {g.state !== 'now' && g.state !== 'done' && <Button size="sm" variant="outline" onClick={() => void change(g.id, 'now')}>Make it my focus</Button>}
                        {p?.link && <Link to={p.link} className="self-center text-label font-bold text-cocoa underline">Work on it</Link>}
                        <Button size="sm" variant="ghost" onClick={() => void change(g.id, 'dropped')}>Remove</Button>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Screen>
  );
}
