-- OvertimeHub v3.3 schema (migration-friendly)
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

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('new_user','employee','manager'));

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
end;
$$;

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
  unique (shift_id, user_id)
);

-- migrate archived column
alter table public.ot_requests add column if not exists archived boolean;
update public.ot_requests set archived = false where archived is null;
alter table public.ot_requests alter column archived set default false;
alter table public.ot_requests alter column archived set not null;

-- FK to profiles for embedding

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ot_requests_user_id_profiles_fkey') then
    alter table public.ot_requests add constraint ot_requests_user_id_profiles_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end;
$$;

-- COUNTS CACHE
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
  do update set requested = excluded.requested,
               approved  = excluded.approved,
               declined  = excluded.declined,
               updated_at = now();
end;
$$;

create or replace function public.ot_counts_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_ot_counts(old.shift_id);
    return old;
  else
    perform public.recalc_ot_counts(new.shift_id);
    return new;
  end if;
end;
$$;

drop trigger if exists trg_ot_counts on public.ot_requests;
create trigger trg_ot_counts after insert or update or delete on public.ot_requests for each row execute function public.ot_counts_trigger();

-- SOFT DELETE SHIFT + DECLINE RELATED REQUESTS
create or replace function public.delete_shift_and_decline(p_shift_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.shifts set shift_status='deleted', deleted_at=now() where id=p_shift_id;
  update public.ot_requests set status='declined', decided_at=now(), decided_by=auth.uid() where shift_id=p_shift_id and status in ('requested','approved');
end;
$$;

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

create or replace function public.log_event(p_action text, p_entity_type text, p_entity_id uuid, p_details jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log(actor_user_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_details);
end;
$$;

-- Enable RLS
alter table public.shifts enable row level security;
alter table public.ot_requests enable row level security;
alter table public.ot_shift_counts enable row level security;

-- Policies

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_select_manager_all" on public.profiles;
create policy "profiles_select_manager_all" on public.profiles for select using (public.is_manager(auth.uid()));

drop policy if exists "profiles_update_manager_all" on public.profiles;
create policy "profiles_update_manager_all" on public.profiles for update using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));


drop policy if exists "shifts_select_approved" on public.shifts;
create policy "shifts_select_approved" on public.shifts for select using (public.is_employee(auth.uid()));

drop policy if exists "shifts_insert_manager" on public.shifts;
create policy "shifts_insert_manager" on public.shifts for insert with check (public.is_manager(auth.uid()));

drop policy if exists "shifts_update_manager" on public.shifts;
create policy "shifts_update_manager" on public.shifts for update using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));


drop policy if exists "ot_select_own" on public.ot_requests;
create policy "ot_select_own" on public.ot_requests for select using (auth.uid() = user_id);

drop policy if exists "ot_select_manager" on public.ot_requests;
create policy "ot_select_manager" on public.ot_requests for select using (public.is_manager(auth.uid()));

-- Employees can insert own requested

drop policy if exists "ot_insert_own_requested" on public.ot_requests;
create policy "ot_insert_own_requested" on public.ot_requests
for insert with check (public.is_employee(auth.uid()) and auth.uid() = user_id and status = 'requested' and archived = false);

-- Employees can cancel their own request

drop policy if exists "ot_update_own_cancel" on public.ot_requests;
create policy "ot_update_own_cancel" on public.ot_requests
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id and status = 'cancelled');

-- NEW: Employees can re-request their own OT after cancel/decline (needed for update-first)

drop policy if exists "ot_update_own_request" on public.ot_requests;
create policy "ot_update_own_request" on public.ot_requests
for update using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and status = 'requested'
  and archived = false
  and decided_at is null
  and decided_by is null
);

-- Employees can archive own request after shift date passed

drop policy if exists "ot_update_own_archive" on public.ot_requests;
create policy "ot_update_own_archive" on public.ot_requests
for update using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and archived = true
  and exists (select 1 from public.shifts s where s.id = shift_id and s.shift_date < current_date)
);

-- Managers can update any OT request

drop policy if exists "ot_update_manager" on public.ot_requests;
create policy "ot_update_manager" on public.ot_requests
for update using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- Counts select

drop policy if exists "counts_select_approved" on public.ot_shift_counts;
create policy "counts_select_approved" on public.ot_shift_counts
for select using (public.is_employee(auth.uid()));

-- Audit log select managers

drop policy if exists "audit_select_manager" on public.audit_log;
create policy "audit_select_manager" on public.audit_log
for select using (public.is_manager(auth.uid()));
