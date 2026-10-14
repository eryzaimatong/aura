import type { ProfileRow } from './database.types';
import { supabase } from './supabase';

export type EventName =
  | 'scan_completed'
  | 'card_corrected'
  | 'item_added'
  | 'wear_logged'
  | 'outfit_generated'
  | 'outfit_worn';

type Props = Record<string, string | number | boolean | null>;

// One id per app launch, so events can be grouped into sessions without identifying anyone.
const SESSION_ID = crypto.randomUUID();

/**
 * Appends a product event — only for users who switched analytics on (profiles.share_analytics).
 * Props must never hold personal data: no names, photos, colours of a face, or free text.
 * Fire-and-forget: analytics can never break or slow the app.
 */
export function track(profile: Pick<ProfileRow, 'id' | 'share_analytics'>, name: EventName, props: Props = {}): void {
  if (!profile.share_analytics) return;
  void supabase
    .from('events')
    .insert({ user_id: profile.id, name, props, session_id: SESSION_ID })
    .then(({ error }) => {
      if (error && import.meta.env.DEV) console.warn('[track]', name, error.message);
    });
}
