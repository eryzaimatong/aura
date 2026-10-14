/**
 * Age gate helper. The date of birth is used only here, on the device, and is
 * never stored or sent — callers keep the bracket and drop the date (hard rule 4).
 */
export type AgeBracket = 'under_13' | '13_17' | '18_24' | '25_34' | '35_44' | '45_plus';

export function ageOn(dob: Date, today: Date = new Date()): number {
  let age = today.getFullYear() - dob.getFullYear();
  const hadBirthday =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

/** Returns null for an invalid or future date. */
export function ageBracketFromDob(dob: Date, today: Date = new Date()): AgeBracket | null {
  if (Number.isNaN(dob.getTime()) || dob > today) return null;
  const age = ageOn(dob, today);
  if (age < 13) return 'under_13';
  if (age < 18) return '13_17';
  if (age < 25) return '18_24';
  if (age < 35) return '25_34';
  if (age < 45) return '35_44';
  return '45_plus';
}

/** Minors get guardian consent, and sharing and the shop are turned off. */
export function isMinor(bracket: AgeBracket): boolean {
  return bracket === '13_17';
}

const BRACKETS: readonly AgeBracket[] = ['under_13', '13_17', '18_24', '25_34', '35_44', '45_plus'];

export function isAgeBracket(value: unknown): value is AgeBracket {
  return typeof value === 'string' && (BRACKETS as readonly string[]).includes(value);
}

/** Formats typed digits as "DD / MM / YYYY" while the user types. */
export function formatDobInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join(' / ');
}

/** Parses "DD / MM / YYYY" into a real calendar date, or null (e.g. 31/02, year before 1900). */
export function parseDob(text: string): Date | null {
  const digits = text.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  if (year < 1900) return null;
  const date = new Date(year, month - 1, day);
  const isReal = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isReal ? date : null;
}
