-- OvertimeHub v3.6 schema (FIXED + NOTES migration)
-- Fixes:
-- 1) cron.schedule quoting (no nested $$)
-- 2) notes columns added via ALTER TABLE for existing databases

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
create trigger trg_profiles_updated_at
before update on public.profiles for each row execute function public.set_updated_at();

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
create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

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

-- APP SETTINGS
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

-- ROSTER CONFIG + PATTERN
create table if not exists public.roster_config (id int primary key, base_date date not null);
insert into public.roster_config(id, base_date) values (1,'2026-02-02')
on conflict (id) do update set base_date=excluded.base_date;

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

-- Seed patterns (your full list) — safe to re-run
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
  ('Team4', 25, 'rest', null::time, null::time),
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
  shift_type text not null default 'day',
  start_time time not null,
  end_time time not null,
  spots_available integer not null default 0 check (spots_available >= 0),
  department text not null,
  notes text,
  shift_status text not null default 'active',
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- IMPORTANT MIGRATION: if shifts existed already, ensure notes column exists
alter table public.shifts add column if not exists notes text;

alter table public.shifts drop constraint if exists shifts_shift_type_check;
alter table public.shifts add constraint shifts_shift_type_check check (shift_type in ('day','night'));

alter table public.shifts drop constraint if exists shifts_status_check;
alter table public.shifts add constraint shifts_status_check check (shift_status in ('active','deleted'));

create unique index if not exists uq_shifts_date_type on public.shifts(shift_date, shift_type);
create index if not exists idx_shifts_date on public.shifts(shift_date);

-- OT REQUESTS
create table if not exists public.ot_requests (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('requested','approved','declined','cancelled')),
  archived boolean not null default false,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  notes text,
  unique (shift_id, user_id)
);

-- IMPORTANT MIGRATION: if ot_requests existed already, ensure notes column exists
alter table public.ot_requests add column if not exists notes text;

alter table public.ot_requests drop constraint if exists ot_requests_notes_len_check;
alter table public.ot_requests add constraint ot_requests_notes_len_check
  check (notes is null or length(notes) <= 500);

-- FKs to profiles for embedding
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ot_requests_user_id_profiles_fkey') THEN
    ALTER TABLE public.ot_requests
      ADD CONSTRAINT ot_requests_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ot_requests_decided_by_profiles_fkey') THEN
    ALTER TABLE public.ot_requests
      ADD CONSTRAINT ot_requests_decided_by_profiles_fkey
      FOREIGN KEY (decided_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

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

DROP TRIGGER IF EXISTS trg_ot_counts ON public.ot_requests;
CREATE TRIGGER trg_ot_counts AFTER INSERT OR UPDATE OR DELETE ON public.ot_requests
FOR EACH ROW EXECUTE FUNCTION public.ot_counts_trigger();

-- Soft delete shift
create or replace function public.delete_shift_and_decline(p_shift_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.shifts set shift_status='deleted', deleted_at=now() where id=p_shift_id;
  update public.ot_requests set status='declined', decided_at=now(), decided_by=auth.uid() where shift_id=p_shift_id and status in ('requested','approved');
end; $$;

grant execute on function public.delete_shift_and_decline(uuid) to authenticated;

-- Audit log
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

-- Cleanup function
create or replace function public.cleanup_old_shift_data(p_days int default 50)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.shifts where shift_date < (current_date - make_interval(days => p_days));
  delete from public.audit_log
    where created_at < (now() - make_interval(days => p_days))
      and entity_type in ('shift','ot_request');
end; $$;

grant execute on function public.cleanup_old_shift_data(int) to authenticated;

-- FIXED scheduling (no nested $$)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name='pg_cron') THEN
    BEGIN
      EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_cron';
      PERFORM cron.schedule('oh_cleanup_old_shift_data', '0 3 * * *', 'select public.cleanup_old_shift_data(50);');
    EXCEPTION WHEN undefined_function OR insufficient_privilege OR others THEN
      NULL;
    END;
  END IF;
END $$;

-- Enable RLS
alter table public.shifts enable row level security;
alter table public.ot_requests enable row level security;
alter table public.ot_shift_counts enable row level security;

-- Policies (your original set)
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS profiles_select_manager_all ON public.profiles;
CREATE POLICY profiles_select_manager_all ON public.profiles FOR SELECT USING (public.is_manager(auth.uid()));
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS profiles_update_manager_all ON public.profiles;
CREATE POLICY profiles_update_manager_all ON public.profiles FOR UPDATE USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

DROP POLICY IF EXISTS app_settings_select_auth ON public.app_settings;
CREATE POLICY app_settings_select_auth ON public.app_settings FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS app_settings_update_manager ON public.app_settings;
CREATE POLICY app_settings_update_manager ON public.app_settings FOR INSERT WITH CHECK (public.is_manager(auth.uid()));
DROP POLICY IF EXISTS app_settings_update_manager2 ON public.app_settings;
CREATE POLICY app_settings_update_manager2 ON public.app_settings FOR UPDATE USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

DROP POLICY IF EXISTS shifts_select_approved ON public.shifts;
CREATE POLICY shifts_select_approved ON public.shifts FOR SELECT USING (public.is_employee(auth.uid()));
DROP POLICY IF EXISTS shifts_insert_manager ON public.shifts;
CREATE POLICY shifts_insert_manager ON public.shifts FOR INSERT WITH CHECK (public.is_manager(auth.uid()));
DROP POLICY IF EXISTS shifts_update_manager ON public.shifts;
CREATE POLICY shifts_update_manager ON public.shifts FOR UPDATE USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

DROP POLICY IF EXISTS ot_select_own ON public.ot_requests;
CREATE POLICY ot_select_own ON public.ot_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS ot_select_manager ON public.ot_requests;
CREATE POLICY ot_select_manager ON public.ot_requests FOR SELECT USING (public.is_manager(auth.uid()));
DROP POLICY IF EXISTS ot_insert_own_requested ON public.ot_requests;
CREATE POLICY ot_insert_own_requested ON public.ot_requests FOR INSERT WITH CHECK (public.is_employee(auth.uid()) and auth.uid() = user_id and status='requested' and archived=false);
DROP POLICY IF EXISTS ot_update_own_cancel ON public.ot_requests;
CREATE POLICY ot_update_own_cancel ON public.ot_requests FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id and status='cancelled');
DROP POLICY IF EXISTS ot_update_own_archive_declined_cancelled ON public.ot_requests;
CREATE POLICY ot_update_own_archive_declined_cancelled ON public.ot_requests FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id and archived=true and status in ('declined','cancelled'));
DROP POLICY IF EXISTS ot_update_own_archive ON public.ot_requests;
CREATE POLICY ot_update_own_archive ON public.ot_requests FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id and archived=true and exists (select 1 from public.shifts s where s.id = shift_id and s.shift_date < current_date));
DROP POLICY IF EXISTS ot_update_own_notes ON public.ot_requests;
CREATE POLICY ot_update_own_notes ON public.ot_requests FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id and (notes is null or length(notes)<=500));
DROP POLICY IF EXISTS ot_update_manager ON public.ot_requests;
CREATE POLICY ot_update_manager ON public.ot_requests FOR UPDATE USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

DROP POLICY IF EXISTS counts_select_approved ON public.ot_shift_counts;
CREATE POLICY counts_select_approved ON public.ot_shift_counts FOR SELECT USING (public.is_employee(auth.uid()));

alter table public.user_staffing enable row level security;
DROP POLICY IF EXISTS staff_select_own ON public.user_staffing;
CREATE POLICY staff_select_own ON public.user_staffing FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS staff_select_manager ON public.user_staffing;
CREATE POLICY staff_select_manager ON public.user_staffing FOR SELECT USING (public.is_manager(auth.uid()));
DROP POLICY IF EXISTS staff_upsert_own_employee ON public.user_staffing;
CREATE POLICY staff_upsert_own_employee ON public.user_staffing FOR INSERT WITH CHECK (public.is_employee_only(auth.uid()) and auth.uid() = user_id);
DROP POLICY IF EXISTS staff_update_own_employee ON public.user_staffing;
CREATE POLICY staff_update_own_employee ON public.user_staffing FOR UPDATE USING (public.is_employee_only(auth.uid()) and auth.uid()=user_id) WITH CHECK (public.is_employee_only(auth.uid()) and auth.uid()=user_id);
DROP POLICY IF EXISTS staff_upsert_manager ON public.user_staffing;
CREATE POLICY staff_upsert_manager ON public.user_staffing FOR INSERT WITH CHECK (public.is_manager(auth.uid()));
DROP POLICY IF EXISTS staff_update_manager ON public.user_staffing;
CREATE POLICY staff_update_manager ON public.user_staffing FOR UPDATE USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

DROP POLICY IF EXISTS roster_select_auth ON public.team_roster_pattern;
CREATE POLICY roster_select_auth ON public.team_roster_pattern FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS roster_config_select_auth ON public.roster_config;
CREATE POLICY roster_config_select_auth ON public.roster_config FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS audit_select_manager ON public.audit_log;
CREATE POLICY audit_select_manager ON public.audit_log FOR SELECT USING (public.is_manager(auth.uid()));
-- =========================================================
-- Auto-decline other shift (Day/Night same calendar day)
-- When an OT request becomes APPROVED, decline the user's
-- request for the opposite shift_type on the same shift_date.
-- =========================================================

create or replace function public.auto_decline_other_shift_same_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift_date date;
  v_shift_type text;
  v_other_type text;
  v_other_shift_id uuid;
begin
  -- Only act when a request transitions to approved
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.status <> 'approved' then
    return new;
  end if;

  if old.status = 'approved' then
    return new;
  end if;

  -- Determine the shift date/type of the approved request
  select s.shift_date, s.shift_type
    into v_shift_date, v_shift_type
  from public.shifts s
  where s.id = new.shift_id;

  if v_shift_date is null or v_shift_type is null then
    return new;
  end if;

  v_other_type := case when v_shift_type = 'day' then 'night' else 'day' end;

  -- Find the other shift (same date, opposite type)
  select s2.id
    into v_other_shift_id
  from public.shifts s2
  where s2.shift_date = v_shift_date
    and s2.shift_type = v_other_type
  limit 1;

  if v_other_shift_id is null then
    return new;
  end if;

  -- Decline the user's other request for that other shift, if it exists
  -- (Declines both 'requested' and 'approved' to enforce one-per-day)
  update public.ot_requests r
     set status = 'declined',
         decided_at = now(),
         decided_by = new.decided_by
   where r.user_id = new.user_id
     and r.shift_id = v_other_shift_id
     and r.id <> new.id
     and r.status in ('requested','approved');

  return new;
end;
$$;

drop trigger if exists trg_auto_decline_other_shift_same_day on public.ot_requests;

create trigger trg_auto_decline_other_shift_same_day
after update of status on public.ot_requests
for each row
execute function public.auto_decline_other_shift_same_day();
