import { AuthError } from '@supabase/supabase-js';

const OFFLINE = 'Mira can’t reach the internet. Check your connection and try again.';
const SLOW = 'This is taking too long. Your connection may be slow. Try again in a moment.';

/** Turns Supabase auth errors into Mira-voiced copy. Unknown errors keep their message. */
export function authErrorMessage(err: unknown): string {
  if (err instanceof AuthError) {
    switch (err.code) {
      case 'invalid_credentials':
        return "That email and password don't match. Check for typos and try again.";
      case 'email_not_confirmed':
        return 'Your email isn’t confirmed yet. Tap the link we sent you, then log in.';
      case 'user_already_exists':
      case 'email_exists':
        return 'There’s already an account with this email. Try logging in instead.';
      case 'weak_password':
        return 'That password is too easy to guess. Try a longer one.';
      case 'over_email_send_rate_limit':
      case 'over_request_rate_limit':
        return 'Too many tries in a row. Wait a minute, then try again.';
      case 'signup_disabled':
        return 'Sign-ups are paused right now. Please try again later.';
    }
    if (err.status === 0 || err.name === 'AuthRetryableFetchError') {
      return OFFLINE;
    }
    return err.message;
  }
  if (err instanceof TypeError) return OFFLINE;
  // Database errors arrive as plain objects; a timed-out or failed fetch shows up in the message.
  const message = typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) : '';
  if (/TimeoutError|AbortError|timed out/i.test(message)) return SLOW;
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) return OFFLINE;
  return message || 'Something went wrong. Please try again.';
}
