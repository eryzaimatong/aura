import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { authErrorMessage } from '../authErrors';
import type { ProfileRow } from '../database.types';
import { ensureProfile } from '../profile';
import { supabase } from '../supabase';
import { clearClosetCache } from '../closet/cache';
import { clearReminder } from '../reminders';
import { AuthContext, type AuthContextValue, type AuthState, type ProfilePatch } from './context';

type ProfileResult = { userId: string; profile: ProfileRow } | { userId: string; error: string };

export function AuthProvider({ children }: { children: ReactNode }) {
  // undefined = not read from storage yet; null = signed out
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [result, setResult] = useState<ProfileResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    // Keep this callback synchronous: awaiting Supabase calls inside it can deadlock the client.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  // Load (or create) the profile once per signed-in user, not on every token refresh.
  const userId = session?.user.id;
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const id = session.user.id;
    ensureProfile(session.user)
      .then((profile) => !cancelled && setResult({ userId: id, profile }))
      .catch((err: unknown) => !cancelled && setResult({ userId: id, error: authErrorMessage(err) }));
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately not `session`: token refreshes replace the object
  }, [userId, attempt]);

  const signOut = useCallback(async () => {
    await clearReminder();
    clearClosetCache();
    await supabase.auth.signOut();
    setResult(null);
  }, []);

  const retry = useCallback(() => {
    setResult(null);
    setAttempt((n) => n + 1);
  }, []);

  const updateProfile = useCallback(async (patch: ProfilePatch) => {
    if (!result || 'error' in result) throw new Error('No profile loaded.');
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', result.userId).select('*').single();
    if (error) throw error;
    setResult({ userId: result.userId, profile: data });
  }, [result]);

  const state = useMemo<AuthState>(() => {
    if (session === undefined) return { status: 'loading' };
    if (session === null) return { status: 'signed_out' };
    if (!result || result.userId !== session.user.id) return { status: 'loading' };
    if ('error' in result) return { status: 'error', session, message: result.error };
    return { status: 'ready', session, profile: result.profile };
  }, [session, result]);

  const value = useMemo<AuthContextValue>(() => ({ state, signOut, retry, updateProfile }), [state, signOut, retry, updateProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
