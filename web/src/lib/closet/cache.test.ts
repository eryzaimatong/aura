import { beforeEach, describe, expect, it, vi } from 'vitest';

const listItems = vi.fn();
vi.mock('./data', () => ({
  listItems: (...a: unknown[]) => listItems(...a),
  wearLog: () => Promise.resolve([]),
  signedUrls: () => Promise.resolve(new Map()),
}));

const { clearClosetCache, ensureFresh, invalidateCloset, snapshot } = await import('./cache');
const msg = () => 'failed';

describe('closet cache', () => {
  beforeEach(() => {
    clearClosetCache();
    listItems.mockReset().mockResolvedValue([{ id: 'a', image_path: 'u/a.webp' }]);
  });

  it('fetches once for concurrent callers and serves the copy while fresh', async () => {
    await Promise.all([ensureFresh('u', msg), ensureFresh('u', msg)]);
    await ensureFresh('u', msg);
    expect(listItems).toHaveBeenCalledTimes(1);
    expect(snapshot('u').status).toBe('ready');
    expect(snapshot('someone-else').status).toBe('loading');
  });

  it('refetches after a write invalidates it', async () => {
    await ensureFresh('u', msg);
    invalidateCloset();
    await ensureFresh('u', msg);
    expect(listItems).toHaveBeenCalledTimes(2);
  });

  it('keeps showing data when a background refresh fails', async () => {
    await ensureFresh('u', msg);
    listItems.mockRejectedValueOnce(new Error('offline'));
    await ensureFresh('u', msg, true);
    expect(snapshot('u').status).toBe('ready');
  });

  it('a fetch that finishes after sign-out does not restore the closet', async () => {
    let release!: (v: unknown) => void;
    listItems.mockReturnValueOnce(new Promise((r) => { release = r; }));
    const pending = ensureFresh('u', msg);
    clearClosetCache();
    release([{ id: 'a', image_path: 'u/a.webp' }]);
    await pending;
    expect(snapshot('u').status).toBe('loading');
  });
});
