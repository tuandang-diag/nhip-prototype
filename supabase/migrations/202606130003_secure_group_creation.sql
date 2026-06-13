create or replace function public.add_group_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.group_organizers(group_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (group_id, user_id) do nothing;
  return new;
end;
$$;

create or replace function public.create_group(group_name text, group_code text)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  created_group public.groups%rowtype;
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  insert into public.groups(name, code, created_by)
  values (trim(group_name), upper(trim(group_code)), current_user_id)
  returning * into created_group;

  insert into public.group_organizers(group_id, user_id, role)
  values (created_group.id, current_user_id, 'owner')
  on conflict (group_id, user_id) do nothing;

  return created_group;
end;
$$;

revoke all on function public.create_group(text, text) from public;
grant execute on function public.create_group(text, text) to authenticated;
