create or replace function public.import_group_members(target_group_id uuid, roster jsonb)
returns setof public.members
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item jsonb;
  inserted_member public.members%rowtype;
begin
  if not public.is_group_organizer(target_group_id) then
    raise exception 'not_authorized';
  end if;
  for item in select * from jsonb_array_elements(roster)
  loop
    insert into public.members(group_id, name, student_id, team, email)
    values (
      target_group_id,
      trim(item ->> 'name'),
      trim(item ->> 'student_id'),
      coalesce(trim(item ->> 'team'), ''),
      nullif(lower(trim(item ->> 'email')), '')
    )
    on conflict (group_id, student_id) do update
      set name = excluded.name, team = excluded.team, email = excluded.email, updated_at = now()
    returning * into inserted_member;
    return next inserted_member;
  end loop;
end;
$$;

create or replace function public.prepare_reminders(target_announcement_id uuid, target_member_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if not exists (
    select 1 from public.announcements a
    where a.id = target_announcement_id and public.is_group_organizer(a.group_id)
  ) then
    raise exception 'not_authorized';
  end if;

  insert into public.reminders(announcement_id, member_id, prepared_by)
  select target_announcement_id, action.member_id, (select auth.uid())
  from public.member_actions action
  where action.announcement_id = target_announcement_id
    and action.member_id = any(target_member_ids)
    and action.status <> 'completed'
    and not exists (
      select 1 from public.reminders r
      where r.announcement_id = target_announcement_id
        and r.member_id = action.member_id
        and r.created_at > now() - interval '24 hours'
    );
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
