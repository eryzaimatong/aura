import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './authErrors';

describe('authErrorMessage', () => {
  it('turns timed-out and failed database calls into plain advice', () => {
    expect(authErrorMessage({ message: 'TimeoutError: signal timed out', code: '' })).toMatch(/too long/);
    expect(authErrorMessage({ message: 'TypeError: Failed to fetch' })).toMatch(/can’t reach the internet/);
    expect(authErrorMessage(new TypeError('Failed to fetch'))).toMatch(/can’t reach the internet/);
  });
  it('keeps other messages', () => {
    expect(authErrorMessage({ message: 'duplicate key value' })).toBe('duplicate key value');
    expect(authErrorMessage(42)).toBe('Something went wrong. Please try again.');
  });
});
