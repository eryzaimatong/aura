const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return 'What should Mira call you?';
  if (trimmed.length > 50) return 'Keep it under 50 characters.';
  return undefined;
}

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Enter your email.';
  if (!EMAIL_RE.test(email.trim())) return 'That email looks incomplete.';
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (password.length < 8) return 'Use at least 8 characters.';
  return undefined;
}
