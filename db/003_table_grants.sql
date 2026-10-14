-- ============================================================
-- 003 — table grants for the API roles
-- This project doesn't auto-grant new tables to anon/authenticated,
-- so every request failed with "permission denied" before RLS ran.
-- Grants say which operations a role may attempt; RLS still decides
-- which rows. Run after 001 and 002. Safe to re-run (grants are idempotent).
-- ============================================================
begin;

-- catalogue: anyone may browse (RLS limits to active rows)
grant select on products to anon, authenticated;

-- the user's own data: full access, rows limited by owner_all
grant select, insert, update, delete on
  profiles, scans, aura_cards, undertone_quiz, measurements, style_prints,
  closet_items, outfits, outfit_items, wear_log, trips, goals
to authenticated;

-- append-only records: consent audit trail and training labels are never edited
grant select, insert on consents, card_corrections to authenticated;

-- requests and feedback: users create and read their own
grant select, insert on data_requests to authenticated;
grant select, insert, delete on rec_feedback to authenticated;

-- server-written: recommendations and experiment arms come from the API,
-- so users can read theirs but not forge them
grant select on recommendations, experiment_assignments to authenticated;

-- wear stats (security_invoker views from 001)
grant select on item_wear_stats, closet_utilisation to authenticated;

-- analytics: write-only
grant insert on events to authenticated;
grant usage on sequence events_id_seq to authenticated;

-- experiments, model_metrics: no grants — service role only

commit;
