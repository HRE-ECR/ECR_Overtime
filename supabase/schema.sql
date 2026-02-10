-- OvertimeHub Supabase Schema
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- 1) Profiles table: ties auth.users to business metadata
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'employee' check (role in ('employee', 'manager')),
  department text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles(id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'employee')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 2) Shifts: manager posts overtime slots
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  spots_available integer not null default 1 check (spots_available > 0),
  department text not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_shifts_date on public.shifts(shift_date);

-- 3) Responses: users set availability per shift
create table if not exists public.shift_responses (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('available', 'backup', 'unavailable')),
  updated_at timestamptz not null default now(),
  unique (shift_id, user_id)
);

drop trigger if exists trg_shift_responses_updated_at on public.shift_responses;
create trigger trg_shift_responses_updated_at
before update on public.shift_responses
for each row execute function public.set_updated_at();

create index if not exists idx_shift_responses_shift on public.shift_responses(shift_id);

-- 4) Confirmations: manager confirms allocation(s)
create table if not exists public.shift_confirmations (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (shift_id, user_id)
);

create index if not exists idx_shift_confirmations_shift on public.shift_confirmations(shift_id);

-- ===== Row Level Security (RLS) =====
alter table public.profiles enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_responses enable row level security;
alter table public.shift_confirmations enable row level security;

-- Helper: is_manager
create or replace function public.is_manager(uid uuid)
returns boolean as $$
  select exists(
    select 1 from public.profiles p
    where p.id = uid and p.role = 'manager'
  );
$$ language sql stable;

-- Profiles policies

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id);

-- Shifts policies

drop policy if exists "shifts_select_all_authed" on public.shifts;
create policy "shifts_select_all_authed" on public.shifts
for select using (auth.role() = 'authenticated');

drop policy if exists "shifts_insert_manager" on public.shifts;
create policy "shifts_insert_manager" on public.shifts
for insert with check (public.is_manager(auth.uid()));

drop policy if exists "shifts_update_manager" on public.shifts;
create policy "shifts_update_manager" on public.shifts
for update using (public.is_manager(auth.uid()));

drop policy if exists "shifts_delete_manager" on public.shifts;
create policy "shifts_delete_manager" on public.shifts
for delete using (public.is_manager(auth.uid()));

-- Responses policies

drop policy if exists "responses_select_own" on public.shift_responses;
create policy "responses_select_own" on public.shift_responses
for select using (auth.uid() = user_id);

drop policy if exists "responses_upsert_own" on public.shift_responses;
create policy "responses_upsert_own" on public.shift_responses
for insert with check (auth.uid() = user_id);

drop policy if exists "responses_update_own" on public.shift_responses;
create policy "responses_update_own" on public.shift_responses
for update using (auth.uid() = user_id);

-- Confirmations policies

drop policy if exists "confirmations_select_authed" on public.shift_confirmations;
create policy "confirmations_select_authed" on public.shift_confirmations
for select using (auth.role() = 'authenticated');

drop policy if exists "confirmations_insert_manager" on public.shift_confirmations;
create policy "confirmations_insert_manager" on public.shift_confirmations
for insert with check (public.is_manager(auth.uid()));

drop policy if exists "confirmations_delete_manager" on public.shift_confirmations;
create policy "confirmations_delete_manager" on public.shift_confirmations
for delete using (public.is_manager(auth.uid()));
