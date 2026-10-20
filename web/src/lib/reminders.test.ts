import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {} }));
vi.mock('./native', () => ({ isNative: false }));
const { isAppPath } = await import('./reminders');

describe('isAppPath', () => {
  it('accepts in-app paths only', () => {
    expect(isAppPath('/today')).toBe(true);
    expect(isAppPath('/looks?item=abc-1')).toBe(true);
    for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '/x:y', 'today', 42, undefined]) {
      expect(isAppPath(bad)).toBe(false);
    }
  });
});
