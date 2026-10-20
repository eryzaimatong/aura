-- ============================================================
-- 007 — Saved looks
-- Until now, wearing an outfit stored it with saved = true. "Saved" now means the
-- user tapped Save, so outfits that were only worn are switched back to false.
-- Only touches outfits that have wear_log rows. Safe to re-run.
-- ============================================================
begin;

update outfits o
set saved = false
where o.saved
  and exists (select 1 from wear_log w where w.outfit_id = o.id);

commit;
