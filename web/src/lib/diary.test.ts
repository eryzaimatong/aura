import { describe, expect, it } from 'vitest';
import type { ClosetItem } from './closet/data';
import { idleLabel, rediscover, streak } from './diary';

const TODAY = new Date(2026, 9, 20); // 20 Oct 2026, local

function item(id: string, over: Partial<ClosetItem> = {}): ClosetItem {
  return {
    id, user_id: 'u', name: id, category: 'top', subcategory: null, image_path: `${id}.webp`, dominant_colors: [],
    lab_primary: null, in_palette: null, auto_tagged: true, seasonality: null, archived: false,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', wearCount: 0, lastWorn: null, ...over,
  };
}

describe('rediscover', () => {
  it('picks pieces idle 30+ days, longest first, and skips accessories', () => {
    const items = [
      item('recent', { wearCount: 3, lastWorn: '2026-10-15' }),
      item('idle40', { wearCount: 2, lastWorn: '2026-09-10' }),
      item('idle90', { wearCount: 1, lastWorn: '2026-07-22' }),
      item('belt', { category: 'accessory', lastWorn: '2026-01-05', wearCount: 1 }),
    ];
    expect(rediscover(items, TODAY).map((r) => r.item.id)).toEqual(['idle90', 'idle40']);
  });

  it('gives never-worn pieces a two-week grace period', () => {
    const items = [item('fresh', { created_at: '2026-10-12T03:00:00Z' }), item('old', { created_at: '2026-09-01T03:00:00Z' })];
    const picks = rediscover(items, TODAY);
    expect(picks.map((r) => r.item.id)).toEqual(['old']);
    expect(idleLabel(picks[0]!)).toBe('not worn yet');
  });

  it('labels idle time in weeks, then months', () => {
    const [weeks, months] = rediscover([
      item('a', { wearCount: 1, lastWorn: '2026-09-15' }),
      item('b', { wearCount: 1, lastWorn: '2026-06-01' }),
    ], TODAY).sort((x, y) => x.idleDays - y.idleDays);
    expect(idleLabel(weeks!)).toBe('last out 5 weeks ago');
    expect(idleLabel(months!)).toBe('last out 5 months ago');
  });
});

describe('streak', () => {
  it('counts back from yesterday when today is not logged yet', () => {
    const log = ['2026-10-19', '2026-10-18', '2026-10-16'].map((worn_on) => ({ item_id: 'x', worn_on }));
    expect(streak(log, TODAY)).toBe(2);
  });
});
