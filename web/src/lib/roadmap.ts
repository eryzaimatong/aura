/**
 * Glow-up roadmap. Template goals track themselves from real data (closet, wear log,
 * Aura Card); custom goals are free text. Goals are about style, never the body (rule 6).
 */
import type { ClosetItem } from './closet/data';
import { localToday } from './closet/data';
import type { AuraCardRow } from './database.types';
import { streak, type Wear } from './diary';

export type GoalState = 'later' | 'next' | 'now' | 'done' | 'dropped';

export type GoalRow = {
  id: string;
  user_id: string;
  title: string;
  /** "tpl:<key>" for template goals, otherwise the user's own note (or null). */
  detail: string | null;
  state: GoalState;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
};

export interface Context {
  items: ClosetItem[];
  log: Wear[];
  card: AuraCardRow | null;
  today?: Date;
}

export interface Progress {
  /** Line under the title, e.g. "7 of 12 already in your closet". */
  subtitle: string;
  /** The data says it's achieved: show "ready to tick off". */
  met: boolean;
  /** Where to go to work on it. */
  link?: string;
}

const monthPrefix = (d: Date) => localToday(d).slice(0, 8);

export const TEMPLATES: Record<string, { title: string; hint: string; progress: (c: Context) => Progress }> = {
  wear_all: {
    title: 'Wear every item once this month', hint: 'uses your wear log',
    progress: ({ items, log, today = new Date() }) => {
      const worn = new Set(log.filter((w) => w.worn_on.startsWith(monthPrefix(today))).map((w) => w.item_id));
      const left = items.filter((i) => !worn.has(i.id)).length;
      return { subtitle: items.length ? `${left} left this month` : 'Add a few pieces first', met: items.length > 0 && left === 0, link: '/closet' };
    },
  },
  capsule12: {
    title: 'Build a capsule of 12 pieces', hint: 'tracks against your closet',
    progress: ({ items }) => ({ subtitle: `${Math.min(items.length, 12)} of 12 already in your closet`, met: items.length >= 12, link: '/closet/add' }),
  },
  palette_week: {
    title: 'Wear your season palette for a week', hint: 'from your Aura Card',
    progress: ({ items, log, today = new Date() }) => {
      const inPalette = new Set(items.filter((i) => i.in_palette).map((i) => i.id));
      const days = new Set<string>();
      for (let d = 0; d < 7; d++) {
        const day = localToday(new Date(today.getFullYear(), today.getMonth(), today.getDate() - d));
        if (log.some((w) => w.worn_on === day && inPalette.has(w.item_id))) days.add(day);
      }
      return { subtitle: `${days.size} of 7 days this week`, met: days.size >= 7, link: '/looks' };
    },
  },
  streak30: {
    title: 'Keep a 30 day log streak', hint: 'counts days you log an outfit',
    progress: ({ log, today = new Date() }) => {
      const n = streak(log, today);
      return { subtitle: `you are on ${n}`, met: n >= 30, link: '/diary' };
    },
  },
  photo_closet: {
    title: 'Photograph your top 15', hint: 'Quick closet start',
    progress: ({ items }) => ({
      subtitle: items.length >= 15 ? 'all 15 in' : `${15 - items.length} items to go`, met: items.length >= 15, link: '/closet/start',
    }),
  },
  retire5: {
    title: 'Retire 5 pieces you never wear', hint: 'frees space for what you love',
    progress: ({ items }) => ({ subtitle: `${items.filter((i) => i.wearCount === 0).length} never worn so far`, met: false, link: '/closet' }),
  },
  blush: {
    title: 'Learn blush placement for your face', hint: 'Vanity guide',
    progress: () => ({ subtitle: 'Vanity guide', met: false, link: '/vanity' }),
  },
  rescan: {
    title: 'Redo your scan in daylight', hint: 'sharper color reading',
    progress: ({ card }) => ({
      subtitle: card?.season_conf != null ? `color confidence was ${Math.round(card.season_conf * 100)}%` : 'colors are still to finish',
      met: (card?.season_conf ?? 0) >= 0.7, link: '/mirror/scan',
    }),
  },
};

export const templateKey = (g: Pick<GoalRow, 'detail'>) => (g.detail?.startsWith('tpl:') ? g.detail.slice(4) : null);

export function progressFor(g: GoalRow, c: Context): Progress | null {
  const key = templateKey(g);
  return key && TEMPLATES[key] ? TEMPLATES[key].progress(c) : null;
}

/** A first roadmap that fits what the user already has. */
export function starterKeys(c: Context): string[] {
  const keys = ['capsule12', 'wear_all', 'palette_week', 'blush', 'streak30', 'retire5'];
  if (c.items.length < 15) keys.splice(1, 0, 'photo_closet');
  if (!c.card?.season || (c.card.season_conf ?? 1) < 0.6) keys.push('rescan');
  return keys.slice(0, 8);
}

// Hard rule 6: the roadmap is about style, never about bodies.
const BODY_GOAL = /\b(weight|kg|kilos?|lbs?|pounds?|diet|calories?|slim(mer)?|thin(ner)?|fat|lose|tummy|belly|bmi|waistline|abs)\b/i;
export function isBodyGoal(text: string): boolean {
  return BODY_GOAL.test(text);
}
