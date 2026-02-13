-- OvertimeHub v3.6 schema (migration-friendly)
create extension if not exists "pgcrypto";

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'new_user',
  department text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists phone text;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('new_user','employee','manager'));

create or replace function public.set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.profiles no force row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'new_user')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_manager(uid uuid)
returns boolean language sql stable as $$
  select exists(select 1 from public.profiles p where p.id = uid and p.role = 'manager');
$$;

create or replace function public.is_employee(uid uuid)
returns boolean language sql stable as $$
  select exists(select 1 from public.profiles p where p.id = uid and p.role in ('employee','manager'));
$$;

create or replace function public.is_employee_only(uid uuid)
returns boolean language sql stable as $$
  select exists(select 1 from public.profiles p where p.id = uid and p.role = 'employee');
$$;

-- APP SETTINGS (for Test Functions toggle)
create table if not exists public.app_settings (
  id int primary key,
  test_mode_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.app_settings(id, test_mode_enabled)
values (1, false)
on conflict (id) do update set test_mode_enabled = public.app_settings.test_mode_enabled;

alter table public.app_settings enable row level security;

-- USER STAFFING
create table if not exists public.user_staffing (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  team text,
  band text,
  created_at timestamptz not null default now()
);

alter table public.user_staffing enable row level security;

alter table public.user_staffing drop constraint if exists user_staffing_team_check;
alter table public.user_staffing add constraint user_staffing_team_check
  check (team is null or team in ('Team1','Team2','Team3','Team4'));

alter table public.user_staffing drop constraint if exists user_staffing_band_check;
alter table public.user_staffing add constraint user_staffing_band_check
  check (band is null or band in ('Band A','Band B'));

-- ROSTER PATTERN
create table if not exists public.roster_config (
  id int primary key,
  base_date date not null
);

insert into public.roster_config(id, base_date)
values (1, '2026-02-02')
on conflict (id) do update set base_date = excluded.base_date;

create table if not exists public.team_roster_pattern (
  team text not null,
  day_index int not null,
  roster_type text not null,
  start_time time,
  end_time time,
  primary key(team, day_index)
);

alter table public.team_roster_pattern drop constraint if exists team_roster_type_check;
alter table public.team_roster_pattern add constraint team_roster_type_check
  check (roster_type in ('rest','day','night'));

alter table public.team_roster_pattern drop constraint if exists team_roster_day_index_check;
alter table public.team_roster_pattern add constraint team_roster_day_index_check
  check (day_index between 0 and 27);

insert into public.team_roster_pattern(team, day_index, roster_type, start_time, end_time)
values
  ('Team1', 0, 'rest', null::time, null::time),
  ('Team1', 1, 'rest', null::time, null::time),
  ('Team1', 2, 'rest', null::time, null::time),
  ('Team1', 3, 'rest', null::time, null::time),
  ('Team1', 4, 'night', '19:00'::time, '06:00'::time),
  ('Team1', 5, 'night', '19:00'::time, '06:00'::time),
  ('Team1', 6, 'night', '19:00'::time, '06:00'::time),
  ('Team1', 7, 'night', '19:00'::time, '06:00'::time),
  ('Team1', 8, 'rest', null::time, null::time),
  ('Team1', 9, 'rest', null::time, null::time),
  ('Team1', 10, 'rest', null::time, null::time),
  ('Team1', 11, 'day', '06:00'::time, '15:00'::time),
  ('Team1', 12, 'day', '06:00'::time, '15:00'::time),
  ('Team1', 13, 'day', '06:00'::time, '16:00'::time),
  ('Team1', 14, 'rest', null::time, null::time),
  ('Team1', 15, 'night', '19:00'::time, '06:00'::time),
  ('Team1', 16, 'night', '19:00'::time, '06:00'::time),
  ('Team1', 17, 'night', '19:00'::time, '06:00'::time),
  ('Team1', 18, 'rest', null::time, null::time),
  ('Team1', 19, 'rest', null::time, null::time),
  ('Team1', 20, 'rest', null::time, null::time),
  ('Team1', 21, 'day', '06:00'::time, '15:00'::time),
  ('Team1', 22, 'day', '06:00'::time, '15:00'::time),
  ('Team1', 23, 'day', '06:00'::time, '15:00'::time),
  ('Team1', 24, 'day', '06:00'::time, '15:00'::time),
  ('Team1', 25, 'rest', null::time, null::time),
  ('Team1', 26, 'rest', null::time, null::time),
  ('Team1', 27, 'rest', null::time, null::time),
  ('Team2', 0, 'night', '19:00'::time, '06:00'::time),
  ('Team2', 1, 'rest', null::time, null::time),
  ('Team2', 2, 'rest', null::time, null::time),
  ('Team2', 3, 'rest', null::time, null::time),
  ('Team2', 4, 'day', '06:00'::time, '15:00'::time),
  ('Team2', 5, 'day', '06:00'::time, '15:00'::time),
  ('Team2', 6, 'day', '06:00'::time, '16:00'::time),
  ('Team2', 7, 'rest', null::time, null::time),
  ('Team2', 8, 'night', '19:00'::time, '06:00'::time),
  ('Team2', 9, 'night', '19:00'::time, '06:00'::time),
  ('Team2', 10, 'night', '19:00'::time, '06:00'::time),
  ('Team2', 11, 'rest', null::time, null::time),
  ('Team2', 12, 'rest', null::time, null::time),
  ('Team2', 13, 'rest', null::time, null::time),
  ('Team2', 14, 'day', '06:00'::time, '15:00'::time),
  ('Team2', 15, 'day', '06:00'::time, '15:00'::time),
  ('Team2', 16, 'day', '06:00'::time, '15:00'::time),
  ('Team2', 17, 'day', '06:00'::time, '15:00'::time),
  ('Team2', 18, 'rest', null::time, null::time),
  ('Team2', 19, 'rest', null::time, null::time),
  ('Team2', 20, 'rest', null::time, null::time),
  ('Team2', 21, 'rest', null::time, null::time),
  ('Team2', 22, 'rest', null::time, null::time),
  ('Team2', 23, 'rest', null::time, null::time),
  ('Team2', 24, 'rest', null::time, null::time),
  ('Team2', 25, 'night', '19:00'::time, '06:00'::time),
  ('Team2', 26, 'night', '19:00'::time, '06:00'::time),
  ('Team2', 27, 'night', '19:00'::time, '06:00'::time),
  ('Team3', 0, 'rest', null::time, null::time),
  ('Team3', 1, 'night', '19:00'::time, '06:00'::time),
  ('Team3', 2, 'night', '19:00'::time, '06:00'::time),
  ('Team3', 3, 'night', '19:00'::time, '06:00'::time),
  ('Team3', 4, 'rest', null::time, null::time),
  ('Team3', 5, 'rest', null::time, null::time),
  ('Team3', 6, 'rest', null::time, null::time),
  ('Team3', 7, 'day', '06:00'::time, '15:00'::time),
  ('Team3', 8, 'day', '06:00'::time, '15:00'::time),
  ('Team3', 9, 'day', '06:00'::time, '15:00'::time),
  ('Team3', 10, 'day', '06:00'::time, '15:00'::time),
  ('Team3', 11, 'rest', null::time, null::time),
  ('Team3', 12, 'rest', null::time, null::time),
  ('Team3', 13, 'rest', null::time, null::time),
  ('Team3', 14, 'rest', null::time, null::time),
  ('Team3', 15, 'rest', null::time, null::time),
  ('Team3', 16, 'rest', null::time, null::time),
  ('Team3', 17, 'rest', null::time, null::time),
  ('Team3', 18, 'night', '19:00'::time, '06:00'::time),
  ('Team3', 19, 'night', '19:00'::time, '06:00'::time),
  ('Team3', 20, 'night', '19:00'::time, '06:00'::time),
  ('Team3', 21, 'night', '19:00'::time, '06:00'::time),
  ('Team3', 22, 'rest', null::time, null::time),
  ('Team3', 23, 'rest', null::time, null::time),
  ('Team3', 24, 'rest', null::time, null::time),
  ('Team3', 25, 'day', '06:00'::time, '15:00'::time),
  ('Team3', 26, 'day', '06:00'::time, '15:00'::time),
  ('Team3', 27, 'day', '06:00'::time, '16:00'::time),
  ('Team4', 0, 'day', '06:00'::time, '15:00'::time),
  ('Team4', 1, 'day', '06:00'::time, '15:00'::time),
  ('Team4', 2, 'day', '06:00'::time, '15:00'::time),
  ('Team4', 3, 'day', '06:00'::time, '15:00'::time),
  ('Team4', 4, 'rest', null::time, null::time),
  ('Team4', 5, 'rest', null::time, null::time),
  ('Team4', 6, 'rest', null::time, null::time),
  ('Team4', 7, 'rest', null::time, null::time),
  ('Team4', 8, 'rest', null::time, null::time),
  ('Team4', 9, 'rest', null::time, null::time),
  ('Team4', 10, 'rest', null::time, null::time),
  ('Team4', 11, 'night', '19:00'::time, '06:00'::time),
  ('Team4', 12, 'night', '19:00'::time, '06:00'::time),
  ('Team4', 13, 'night', '19:00'::time, '06:00'::time),
  ('Team4', 14, 'night', '19:00'::time, '06:00'::time),
  ('Team4', 15, 'rest', null::time, null::time),
  ('Team4', 16, 'rest', null::time, null::time),
  ('Team4', 17, 'rest', null::time, null::time),
  ('Team4', 18, 'day', '06:00'::time, '15:00'::time),
  ('Team4', 19, 'day', '06:00'::time, '15:00'::time),
  ('Team4', 20, 'day', '06:00'::time, '16:00'::time),
  ('Team4', 21, 'rest', null::time, null::time),
  ('Team4', 22, 'night', '19:00'::time, '06:00'::time),
  ('Team4', 23, 'night', '19:00'::time, '06:00'::time),
  ('Team4', 24, 'night', '19:00'::time, '06:00'::time),
  ('Team4', 25, 'night', '19:00'::time, '06:00'::time),
  ('Team4', 26, 'rest', null::time, null::time),
  ('Team4', 27, 'rest', null::time, null::time)
on conflict (team, day_index)
  do update set roster_type = excluded.roster_type,
                start_time = excluded.start_time,
                end_time = excluded.end_time;

alter table public.team_roster_pattern enable row level security;
alter table public.roster_config enable row level security;

-- SHIFTS
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  shift_date date not null,
  shift_type text,
  start_time time not null,
  end_time time not null,
  spots_available integer not null default 0 check (spots_available >= 0),
  department text not null,
  notes text,
  shift_status text,
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.shifts add column if not exists shift_type text;
update public.shifts set shift_type = case when end_time < start_time then 'night' else 'day' end where shift_type is null;

alter table public.shifts drop constraint if exists shifts_shift_type_check;
alter table public.shifts add constraint shifts_shift_type_check check (shift_type in ('day','night'));
alter table public.shifts alter column shift_type set not null;
alter table public.shifts alter column shift_type set default 'day';

alter table public.shifts add column if not exists shift_status text;
alter table public.shifts add column if not exists deleted_at timestamptz;
update public.shifts set shift_status = coalesce(shift_status,'active') where shift_status is null;

alter table public.shifts drop constraint if exists shifts_status_check;
alter table public.shifts add constraint shifts_status_check check (shift_status in ('active','deleted'));
alter table public.shifts alter column shift_status set not null;
alter table public.shifts alter column shift_status set default 'active';

create unique index if not exists uq_shifts_date_type on public.shifts(shift_date, shift_type);
create index if not exists idx_shifts_date on public.shifts(shift_date);

-- OT REQUESTS
create table if not exists public.ot_requests (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('requested','approved','declined','cancelled')),
  archived boolean,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  notes text,
  unique (shift_id, user_id)
);

alter table public.ot_requests add column if not exists archived boolean;
update public.ot_requests set archived = false where archived is null;
alter table public.ot_requests alter column archived set default false;
alter table public.ot_requests alter column archived set not null;

alter table public.ot_requests add column if not exists notes text;

-- Optional safety: cap notes length
alter table public.ot_requests drop constraint if exists ot_requests_notes_len_check;
alter table public.ot_requests add constraint ot_requests_notes_len_check
  check (notes is null or length(notes) <= 500);

-- FKs to profiles for embedding

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ot_requests_user_id_profiles_fkey') then
    alter table public.ot_requests add constraint ot_requests_user_id_profiles_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end; $$;


do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ot_requests_decided_by_profiles_fkey') then
    alter table public.ot_requests add constraint ot_requests_decided_by_profiles_fkey foreign key (decided_by) references public.profiles(id) on delete set null;
  end if;
end; $$;

-- COUNTS
create table if not exists public.ot_shift_counts (
  shift_id uuid primary key references public.shifts(id) on delete cascade,
  requested int not null default 0,
  approved int not null default 0,
  declined int not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.recalc_ot_counts(p_shift_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r int; a int; d int;
begin
  select sum(case when status='requested' then 1 else 0 end),
         sum(case when status='approved' then 1 else 0 end),
         sum(case when status='declined' then 1 else 0 end)
    into r, a, d
  from public.ot_requests where shift_id = p_shift_id;

  r := coalesce(r,0); a := coalesce(a,0); d := coalesce(d,0);

  insert into public.ot_shift_counts(shift_id, requested, approved, declined, updated_at)
  values (p_shift_id, r, a, d, now())
  on conflict (shift_id)
  do update set requested=excluded.requested, approved=excluded.approved, declined=excluded.declined, updated_at=now();
end; $$;

create or replace function public.ot_counts_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then perform public.recalc_ot_counts(old.shift_id); return old;
  else perform public.recalc_ot_counts(new.shift_id); return new;
  end if;
end; $$;

drop trigger if exists trg_ot_counts on public.ot_requests;
create trigger trg_ot_counts after insert or update or delete on public.ot_requests for each row execute function public.ot_counts_trigger();

-- SOFT DELETE SHIFT
create or replace function public.delete_shift_and_decline(p_shift_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.shifts set shift_status='deleted', deleted_at=now() where id=p_shift_id;
  update public.ot_requests set status='declined', decided_at=now(), decided_by=auth.uid() where shift_id=p_shift_id and status in ('requested','approved');
end; $$;

grant execute on function public.delete_shift_and_decline(uuid) to authenticated;

-- AUDIT LOG
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb
);

alter table public.audit_log enable row level security;

-- CLEANUP: delete shift data older than N days
create or replace function public.cleanup_old_shift_data(p_days int default 50)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Delete shifts older than p_days (cascades to ot_requests and counts)
  delete from public.shifts
  where shift_date < (current_date - make_interval(days => p_days));

  -- Optionally delete audit log entries older than p_days related to shifts/requests
  delete from public.audit_log
  where created_at < (now() - make_interval(days => p_days))
    and entity_type in ('shift','ot_request');
end;
$$;

grant execute on function public.cleanup_old_shift_data(int) to authenticated;

-- Try schedule daily cleanup at 03:00 if pg_cron is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name='pg_cron') THEN
    BEGIN
      EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_cron';
      -- schedule name must be unique per project
      PERFORM cron.schedule('oh_cleanup_old_shift_data', '0 3 * * *', $$select public.cleanup_old_shift_data(50);$$);
    EXCEPTION WHEN undefined_function OR insufficient_privilege OR others THEN
      -- Ignore if cron not supported in this project
      NULL;
    END;
  END IF;
END $$;

-- Enable RLS
alter table public.shifts enable row level security;
alter table public.ot_requests enable row level security;
alter table public.ot_shift_counts enable row level security;

-- POLICIES: PROFILES

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_select_manager_all" on public.profiles;
create policy "profiles_select_manager_all" on public.profiles for select using (public.is_manager(auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_update_manager_all" on public.profiles;
create policy "profiles_update_manager_all" on public.profiles for update using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- POLICIES: USER STAFFING

drop policy if exists "staff_select_own" on public.user_staffing;
create policy "staff_select_own" on public.user_staffing for select using (auth.uid() = user_id);

drop policy if exists "staff_select_manager" on public.user_staffing;
create policy "staff_select_manager" on public.user_staffing for select using (public.is_manager(auth.uid()));

drop policy if exists "staff_upsert_own_employee" on public.user_staffing;
create policy "staff_upsert_own_employee" on public.user_staffing for insert with check (public.is_employee_only(auth.uid()) and auth.uid() = user_id);

drop policy if exists "staff_update_own_employee" on public.user_staffing;
create policy "staff_update_own_employee" on public.user_staffing for update using (public.is_employee_only(auth.uid()) and auth.uid() = user_id) with check (public.is_employee_only(auth.uid()) and auth.uid() = user_id);

drop policy if exists "staff_upsert_manager" on public.user_staffing;
create policy "staff_upsert_manager" on public.user_staffing for insert with check (public.is_manager(auth.uid()));

drop policy if exists "staff_update_manager" on public.user_staffing;
create policy "staff_update_manager" on public.user_staffing for update using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- POLICIES: SHIFTS

drop policy if exists "shifts_select_approved" on public.shifts;
create policy "shifts_select_approved" on public.shifts for select using (public.is_employee(auth.uid()));

drop policy if exists "shifts_insert_manager" on public.shifts;
create policy "shifts_insert_manager" on public.shifts for insert with check (public.is_manager(auth.uid()));

drop policy if exists "shifts_update_manager" on public.shifts;
create policy "shifts_update_manager" on public.shifts for update using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- POLICIES: OT REQUESTS

drop policy if exists "ot_select_own" on public.ot_requests;
create policy "ot_select_own" on public.ot_requests for select using (auth.uid() = user_id);

drop policy if exists "ot_select_manager" on public.ot_requests;
create policy "ot_select_manager" on public.ot_requests for select using (public.is_manager(auth.uid()));

drop policy if exists "ot_insert_own_requested" on public.ot_requests;
create policy "ot_insert_own_requested" on public.ot_requests for insert with check (public.is_employee(auth.uid()) and auth.uid() = user_id and status = 'requested' and archived = false);

drop policy if exists "ot_update_own_cancel" on public.ot_requests;
create policy "ot_update_own_cancel" on public.ot_requests for update using (auth.uid() = user_id) with check (auth.uid() = user_id and status = 'cancelled');

drop policy if exists "ot_update_own_request" on public.ot_requests;
create policy "ot_update_own_request" on public.ot_requests for update using (auth.uid() = user_id) with check (auth.uid() = user_id and status = 'requested' and archived = false and decided_at is null and decided_by is null);

-- Allow employees to archive declined/cancelled any time (for "hide declined/cancelled" button)

drop policy if exists "ot_update_own_archive_declined_cancelled" on public.ot_requests;
create policy "ot_update_own_archive_declined_cancelled" on public.ot_requests
for update using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and archived = true
  and status in ('declined','cancelled')
);

-- Keep archive-after-date policy for other statuses

drop policy if exists "ot_update_own_archive" on public.ot_requests;
create policy "ot_update_own_archive" on public.ot_requests
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id and archived = true and exists (select 1 from public.shifts s where s.id = shift_id and s.shift_date < current_date));

-- Allow employees to update their own notes (requested/approved only)

drop policy if exists "ot_update_own_notes" on public.ot_requests;
create policy "ot_update_own_notes" on public.ot_requests
for update using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (notes is null or length(notes) <= 500)
);


drop policy if exists "ot_update_manager" on public.ot_requests;
create policy "ot_update_manager" on public.ot_requests
for update using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- POLICIES: COUNTS

drop policy if exists "counts_select_approved" on public.ot_shift_counts;
create policy "counts_select_approved" on public.ot_shift_counts for select using (public.is_employee(auth.uid()));

-- POLICIES: ROSTER

drop policy if exists "roster_select_auth" on public.team_roster_pattern;
create policy "roster_select_auth" on public.team_roster_pattern for select using (auth.role() = 'authenticated');

drop policy if exists "roster_config_select_auth" on public.roster_config;
create policy "roster_config_select_auth" on public.roster_config for select using (auth.role() = 'authenticated');

-- POLICIES: APP SETTINGS

drop policy if exists "app_settings_select_auth" on public.app_settings;
create policy "app_settings_select_auth" on public.app_settings for select using (auth.role() = 'authenticated');

drop policy if exists "app_settings_update_manager" on public.app_settings;
create policy "app_settings_update_manager" on public.app_settings
for insert with check (public.is_manager(auth.uid()));

drop policy if exists "app_settings_update_manager2" on public.app_settings;
create policy "app_settings_update_manager2" on public.app_settings
for update using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- POLICIES: AUDIT

drop policy if exists "audit_select_manager" on public.audit_log;
create policy "audit_select_manager" on public.audit_log for select using (public.is_manager(auth.uid()));
