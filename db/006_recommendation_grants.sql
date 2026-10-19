-- ============================================================
-- 006 — let the API (acting as the signed-in user) write Vanity picks
-- 003 kept recommendations read-only. The API now builds makeup / hair / colour
-- picks as the user, so it needs insert + delete. RLS (owner_all) still limits
-- every row to its owner. Safe to re-run.
-- ============================================================
begin;

grant insert, delete on recommendations to authenticated;

commit;
