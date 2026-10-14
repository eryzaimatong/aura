import { isAgeBracket, type AgeBracket } from '../../lib/ageBracket';

/**
 * Carried between onboarding screens in router history state — never storage.
 * Only the bracket travels; the date of birth stays inside AgeCheckScreen.
 */
export interface SignupFlowState {
  bracket: AgeBracket;
  guardianOk: boolean;
}

export function readSignupFlowState(state: unknown): SignupFlowState | null {
  if (typeof state !== 'object' || state === null) return null;
  const { bracket, guardianOk } = state as Record<string, unknown>;
  if (!isAgeBracket(bracket) || bracket === 'under_13') return null;
  if (bracket === '13_17' && guardianOk !== true) return null;
  return { bracket, guardianOk: guardianOk === true };
}

export function readEmailState(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null;
  const { email } = state as Record<string, unknown>;
  return typeof email === 'string' ? email : null;
}

// Under-13 block lasts for the browser session so a child can't immediately retry
// with another date. Only a flag is stored — no date, no bracket.
const BLOCK_KEY = 'aura.age_blocked';

export function markAgeBlocked(): void {
  try {
    sessionStorage.setItem(BLOCK_KEY, '1');
  } catch {
    // storage unavailable (private mode): the block simply won't persist
  }
}

export function isAgeBlocked(): boolean {
  try {
    return sessionStorage.getItem(BLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

/** Where auth emails send people back to. */
export function authRedirectUrl(): string {
  return `${window.location.origin}/`;
}
