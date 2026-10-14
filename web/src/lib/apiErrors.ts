import { ApiError } from './api';

/** Mira-voiced copy for API failures in the scan flow. */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'consent_required':
        return 'Mira needs your OK before scanning. Please review the consent screen.';
      case 'not_signed_in':
      case 'session_expired':
      case 'invalid_token':
        return 'Your session ended. Log in again and Mira will pick up where you left off.';
      case 'no_card':
        return 'There’s no Aura Card yet. Take a selfie first.';
      case 'database_unreachable':
        return 'Mira couldn’t reach your account just now. Try again in a moment.';
    }
    if (err.code.startsWith('database_error')) return 'Mira couldn’t save your card. Try again in a moment.';
    if (err.status === 422) return 'Something in the reading looked off. Please retake the photo.';
    return 'Something went wrong on our side. Please try again.';
  }
  if (err instanceof TypeError) return 'Mira can’t reach the internet. Check your connection and try again.';
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}
