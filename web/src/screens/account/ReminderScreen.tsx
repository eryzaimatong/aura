import { useState } from 'react';
import { Input } from '../../components/Input';
import { ListRow, ListSection } from '../../components/ListRow';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Toggle } from '../../components/Toggle';
import { isNative } from '../../lib/native';
import { DEFAULT_REMINDER, formatTime, loadReminder, setReminder, type Reminder } from '../../lib/reminders';
import { FormAlert } from '../onboarding/FormAlert';

const pad = (n: number) => String(n).padStart(2, '0');

export function ReminderScreen() {
  const [reminder, setLocal] = useState<Reminder | null>(() => loadReminder());
  const [time, setTime] = useState<Reminder>(() => loadReminder() ?? DEFAULT_REMINDER);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function apply(next: Reminder | null) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await setReminder(next);
      setLocal(result === 'on' ? next : null);
      if (result === 'denied') setMessage('Notifications are off for AURA. Turn them on in your phone’s Settings → Apps → AURA → Notifications, then try again.');
    } catch {
      setMessage('Mira couldn’t set the reminder on this phone. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function changeTime(value: string) {
    const [h, m] = value.split(':').map(Number);
    if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return;
    const next = { hour: h, minute: m };
    setTime(next);
    if (reminder) void apply(next);
  }

  return (
    <Screen>
      <ScreenHeader title="Notifications" backTo="/settings" />
      <div className="mb-6 flex items-center gap-3">
        <Mira expression="sleepy" size="sm" />
        <p className="font-mira text-h3 text-cocoa-soft">one gentle nudge a morning, never more.</p>
      </div>

      {!isNative ? (
        <p className="rounded-md bg-sand p-4 text-body text-cocoa-soft">Reminders work in the AURA Android app.</p>
      ) : (
        <ListSection title="Morning outfit">
          <ListRow label="Remind me" hint={reminder ? `Every day at ${formatTime(reminder)}` : 'Off'}
            control={<Toggle label="Morning outfit reminder" checked={reminder !== null} disabled={busy}
              onChange={(on) => void apply(on ? time : null)} />} />
        </ListSection>
      )}

      {isNative && (
        <Input className="mt-4" label="Time" type="time" value={`${pad(time.hour)}:${pad(time.minute)}`} disabled={busy}
          hint="Android may deliver it a few minutes either side, to save battery." onChange={(e) => changeTime(e.target.value)} />
      )}
      {message && <div className="mt-4"><FormAlert message={message} /></div>}
      <p className="mt-6 text-caption text-cocoa-soft">The reminder is scheduled on this phone. Nothing about it is sent to AURA’s servers.</p>
    </Screen>
  );
}
