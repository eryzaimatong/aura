import { AuthError } from '@supabase/supabase-js';

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
      return 'Mira can’t reach the internet. Check your connection and try again.';
    }
    return err.message;
  }
  if (err instanceof TypeError) return 'Mira can’t reach the internet. Check your connection and try again.';
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}
