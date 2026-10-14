-- ============================================================
-- 002 — wear_log ownership
-- Run after 001. A wear row may only point at your own item and,
-- when set, your own outfit. Safe to re-run.
-- ============================================================
begin;

drop policy if exists owner_all on wear_log;
create policy owner_all on wear_log for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (item_id   is null or exists (select 1 from closet_items i where i.id = item_id   and i.user_id = auth.uid()))
    and (outfit_id is null or exists (select 1 from outfits o      where o.id = outfit_id and o.user_id = auth.uid()))
  );

commit;
