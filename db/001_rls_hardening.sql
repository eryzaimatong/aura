-- ============================================================
-- 001 — RLS hardening
-- Run in the Supabase SQL editor, after schema.sql. Safe to re-run.
-- Requires Postgres 15+ (security_invoker on views).
-- ============================================================
begin;

-- ---------- 1. views run as the caller, so owner-only RLS applies ----------
-- Without this, views execute with the owner's rights and expose every
-- user's closet stats to any logged-in user.
alter view item_wear_stats    set (security_invoker = true);
alter view closet_utilisation set (security_invoker = true);

-- ---------- 2. RLS on the remaining tables ----------
-- events: clients may log their own events, never read them back.
-- Admin dashboards read through the API with the service role (bypasses RLS).
alter table events enable row level security;
drop policy if exists insert_own on events;
create policy insert_own on events
  for insert to authenticated
  with check (user_id = auth.uid());

-- experiments, model_metrics: no client access at all.
-- RLS on with no policies = deny for anon and authenticated; service role only.
alter table experiments   enable row level security;
alter table model_metrics enable row level security;

-- ---------- 3. outfit_items: both the outfit and the item must be yours ----------
drop policy if exists owner_via_outfit on outfit_items;
create policy owner_via_outfit on outfit_items for all
  using (
    exists (select 1 from outfits o      where o.id = outfit_id and o.user_id = auth.uid())
    and exists (select 1 from closet_items i where i.id = item_id   and i.user_id = auth.uid())
  )
  with check (
    exists (select 1 from outfits o      where o.id = outfit_id and o.user_id = auth.uid())
    and exists (select 1 from closet_items i where i.id = item_id   and i.user_id = auth.uid())
  );

commit;
