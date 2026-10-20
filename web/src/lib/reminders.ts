import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from './native';

/**
 * The morning outfit nudge: one local notification a day, scheduled on the phone.
 * Nothing is sent to a server, and the setting lives on this device only.
 */

const ID = 701;
const KEY = 'aura.reminder';

export interface Reminder {
  hour: number;
  minute: number;
}

export const DEFAULT_REMINDER: Reminder = { hour: 7, minute: 0 };

export function loadReminder(): Reminder | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as Partial<Reminder>;
    return typeof r.hour === 'number' && typeof r.minute === 'number' ? { hour: r.hour, minute: r.minute } : null;
  } catch {
    return null;
  }
}

function store(r: Reminder | null) {
  try {
    if (r) localStorage.setItem(KEY, JSON.stringify(r));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the schedule still stands on the phone */
  }
}

export type ReminderResult = 'on' | 'off' | 'denied';

/** Schedules (or with `null`, cancels) the daily reminder. Asks for notification permission first. */
export async function setReminder(r: Reminder | null): Promise<ReminderResult> {
  if (!isNative) return 'off';
  await LocalNotifications.cancel({ notifications: [{ id: ID }] });
  if (!r) {
    store(null);
    return 'off';
  }
  let perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') {
    store(null);
    return 'denied';
  }
  await LocalNotifications.schedule({
    notifications: [{
      id: ID,
      title: 'Your outfit is ready ✦',
      body: 'Mira picked today’s look from your closet, weather included.',
      schedule: { on: { hour: r.hour, minute: r.minute }, allowWhileIdle: true },
      smallIcon: 'ic_stat_aura',
      extra: { path: '/today' },
      // Inexact on purpose: no "Alarms & reminders" prompt, and the manifest drops that permission.
      isExactNotification: false,
    }],
  });
  store(r);
  return 'on';
}

/** On sign-out: no reminders for an account that isn't signed in. */
export async function clearReminder(): Promise<void> {
  if (!isNative) return;
  store(null);
  await LocalNotifications.cancel({ notifications: [{ id: ID }] }).catch(() => undefined);
}

/** Same-app paths only: "//host", "/\host" or anything with a scheme would leave the app. */
export function isAppPath(path: unknown): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
    && !path.includes('\\') && !path.includes(':');
}

/** Tapping the notification opens Today. */
export function initReminderTaps(): void {
  if (!isNative) return;
  void LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
    const path = (notification.extra as { path?: unknown } | undefined)?.path;
    if (isAppPath(path)) window.location.assign(path);
  });
}

export function formatTime(r: Reminder): string {
  return new Date(2000, 0, 1, r.hour, r.minute).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}
