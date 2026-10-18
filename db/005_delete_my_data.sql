-- ============================================================
-- 005 — real, immediate, scoped deletion (hard rule 5, DPA 2012 right to erasure)
-- Run after 001–004. Safe to re-run.
--
-- delete_my_data('scans' | 'closet' | 'all') deletes the CALLER's data only
-- (auth.uid()), in one transaction. Closet photos live in Storage and are removed
-- by the app first (Storage files can't be deleted from SQL).
-- ============================================================
begin;

create or replace function public.delete_my_data(scope text)
returns jsonb
language plpgsql
security definer           -- needs to reach auth.users for 'all'; scoped to auth.uid() below
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n_scans int := 0;
  n_items int := 0;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if scope not in ('scans', 'closet', 'all') then
    raise exception 'unknown scope %', scope using errcode = '22023';
  end if;

  if scope in ('scans', 'all') then
    -- Corrections are labels about this person's scans: they go too.
    delete from card_corrections where user_id = uid;
    delete from aura_cards       where user_id = uid;
    delete from undertone_quiz   where user_id = uid;
    delete from scans            where user_id = uid;
    get diagnostics n_scans = row_count;
  end if;

  if scope in ('closet', 'all') then
    delete from outfits      where user_id = uid;   -- outfit_items cascade
    delete from wear_log     where user_id = uid;
    delete from trips        where user_id = uid;
    delete from closet_items where user_id = uid;
    get diagnostics n_items = row_count;
  end if;

  if scope = 'all' then
    -- Removes the login; profiles and every remaining table cascade from it.
    -- events keep no link to the person (user_id is set null).
    delete from auth.users where id = uid;
    return jsonb_build_object('scope', scope, 'account_deleted', true);
  end if;

  insert into data_requests (user_id, kind, status, completed_at)
  values (uid, 'delete_' || scope, 'done', now());

  return jsonb_build_object('scope', scope, 'scans_deleted', n_scans, 'items_deleted', n_items);
end;
$$;

revoke all on function public.delete_my_data(text) from public, anon;
grant execute on function public.delete_my_data(text) to authenticated;

commit;
