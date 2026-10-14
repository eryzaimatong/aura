import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { ProfileRow } from '../database.types';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'ready'; session: Session; profile: ProfileRow }
  | { status: 'error'; session: Session; message: string };

export interface AuthContextValue {
  state: AuthState;
  signOut: () => Promise<void>;
  /** Re-runs profile loading after an error. */
  retry: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For screens behind <RequireAuth>, where the profile is guaranteed. */
export function useProfile(): ProfileRow {
  const { state } = useAuth();
  if (state.status !== 'ready') throw new Error('useProfile used outside a signed-in route');
  return state.profile;
}
