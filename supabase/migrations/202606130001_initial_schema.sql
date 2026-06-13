create extension if not exists pgcrypto;

create type public.member_action_status as enum ('unopened', 'acknowledged', 'completed', 'blocked');
create type public.announcement_status as enum ('draft', 'published', 'closed');
create type public.organizer_role as enum ('owner', 'editor');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  code text not null check (char_length(code) between 2 and 30),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_organizers (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organizer_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  student_id text not null check (char_length(student_id) between 1 and 60),
  team text not null default '',
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, student_id)
);

create table public.member_invites (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  source_text text not null check (char_length(source_text) between 1 and 12000),
  title text not null default '',
  summary text not null default '',
  deadline timestamptz,
  room text not null default '',
  action_label text not null default '',
  completion_type text not null default 'submission' check (completion_type in ('acknowledgement', 'submission')),
  attachments jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  approved_faq jsonb not null default '[]'::jsonb check (jsonb_typeof(approved_faq) = 'array'),
  ai_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(ai_evidence) = 'array'),
  ai_warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(ai_warnings) = 'array'),
  validation_issues jsonb not null default '[]'::jsonb check (jsonb_typeof(validation_issues) = 'array'),
  status public.announcement_status not null default 'draft',
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.member_actions (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  status public.member_action_status not null default 'unopened',
  opened_at timestamptz,
  acknowledged_at timestamptz,
  completed_at timestamptz,
  submission_url text not null default '',
  blocker text not null default '',
  updated_at timestamptz not null default now(),
  primary key (announcement_id, member_id)
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  prepared_by uuid not null references auth.users(id),
  channel text not null default 'copy' check (channel = 'copy'),
  created_at timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_member_id uuid references public.members(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.api_usage_log (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete cascade,
  operation text not null,
  model text,
  duration_ms integer,
  input_tokens integer,
  output_tokens integer,
  outcome text not null,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0
);

create index members_group_id_idx on public.members(group_id);
create index announcements_group_id_idx on public.announcements(group_id);
create index member_actions_announcement_id_idx on public.member_actions(announcement_id);
create index reminders_announcement_member_idx on public.reminders(announcement_id, member_id, created_at desc);
create index activity_log_group_created_idx on public.activity_log(group_id, created_at desc);

create or replace function public.is_group_organizer(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_organizers
    where group_id = target_group_id and user_id = (select auth.uid())
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.add_group_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.group_organizers(group_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_group_created
after insert on public.groups
for each row execute procedure public.add_group_owner();

create or replace function public.create_actions_for_published_announcement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and old.status <> 'published' then
    new.published_at = coalesce(new.published_at, now());
    insert into public.member_actions(announcement_id, member_id)
      select new.id, m.id from public.members m where m.group_id = new.group_id
      on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger before_announcement_publish
before update on public.announcements
for each row execute procedure public.create_actions_for_published_announcement();

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_organizers enable row level security;
alter table public.members enable row level security;
alter table public.member_invites enable row level security;
alter table public.announcements enable row level security;
alter table public.member_actions enable row level security;
alter table public.reminders enable row level security;
alter table public.activity_log enable row level security;
alter table public.api_usage_log enable row level security;
alter table public.rate_limits enable row level security;

create policy "profile self read" on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy "profile self update" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "organizers read groups" on public.groups for select to authenticated
using (public.is_group_organizer(id));
create policy "users create groups" on public.groups for insert to authenticated
with check ((select auth.uid()) = created_by);
create policy "owners update groups" on public.groups for update to authenticated
using (public.is_group_organizer(id)) with check (public.is_group_organizer(id));

create policy "organizers read organizers" on public.group_organizers for select to authenticated
using (public.is_group_organizer(group_id));

create policy "organizers manage members" on public.members for all to authenticated
using (public.is_group_organizer(group_id))
with check (public.is_group_organizer(group_id));

create policy "organizers read invites" on public.member_invites for select to authenticated
using (exists (
  select 1 from public.members m
  where m.id = member_id and public.is_group_organizer(m.group_id)
));

create policy "organizers manage announcements" on public.announcements for all to authenticated
using (public.is_group_organizer(group_id))
with check (public.is_group_organizer(group_id) and created_by = (select auth.uid()));

create policy "organizers read actions" on public.member_actions for select to authenticated
using (exists (
  select 1 from public.announcements a
  where a.id = announcement_id and public.is_group_organizer(a.group_id)
));

create policy "organizers update actions" on public.member_actions for update to authenticated
using (exists (
  select 1 from public.announcements a
  where a.id = announcement_id and public.is_group_organizer(a.group_id)
));

create policy "organizers manage reminders" on public.reminders for all to authenticated
using (exists (
  select 1 from public.announcements a
  where a.id = announcement_id and public.is_group_organizer(a.group_id)
))
with check (
  prepared_by = (select auth.uid()) and exists (
    select 1 from public.announcements a
    where a.id = announcement_id and public.is_group_organizer(a.group_id)
  )
);

create policy "organizers read activity" on public.activity_log for select to authenticated
using (public.is_group_organizer(group_id));
create policy "organizers read api usage" on public.api_usage_log for select to authenticated
using (public.is_group_organizer(group_id));

alter publication supabase_realtime add table public.member_actions;
