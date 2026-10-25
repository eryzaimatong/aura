import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
const { isExpiredTokenReply } = await import('./supabase');

describe('isExpiredTokenReply', () => {
  it('recognises expired-token replies from the database and storage', () => {
    expect(isExpiredTokenReply(401, { code: 'PGRST303', message: 'JWT expired' })).toBe(true);
    expect(isExpiredTokenReply(400, { statusCode: '403', error: 'Unauthorized', message: '"exp" claim timestamp check failed' })).toBe(true);
    expect(isExpiredTokenReply(403, { message: 'jwt expired' })).toBe(true);
  });
  it('leaves other failures alone', () => {
    expect(isExpiredTokenReply(401, { code: '42501', message: 'permission denied for table profiles' })).toBe(false);
    expect(isExpiredTokenReply(404, { message: 'JWT expired' })).toBe(false);
    expect(isExpiredTokenReply(400, null)).toBe(false);
  });
});
