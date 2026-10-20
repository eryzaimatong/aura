-- ============================================================
-- 009 — profiles: users may only change what the app lets them change
-- owner_all lets a user update their whole row, so without this anyone could
-- set plan = 'premium', or move a 13–17 account to an adult bracket and switch
-- sharing back on (hard rule 4). Column grants close that: RLS still decides
-- which row, these decide which columns. Plan changes come from the server
-- (service role) once Play Billing exists. Safe to re-run.
-- ============================================================
begin;

revoke insert, update on profiles from authenticated;

-- Signup creates the row once (age bracket and guardian agreement from the age gate).
grant insert (id, display_name, age_bracket, guardian_ok, region, units, share_analytics)
  on profiles to authenticated;

-- Settings: name, units, analytics opt-in. Nothing else.
grant update (display_name, units, share_analytics) on profiles to authenticated;

commit;
