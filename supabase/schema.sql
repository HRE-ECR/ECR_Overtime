create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'employee' check (role in ('employee', 'manager')),
  department text,
  has_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles(id, full_name, role, has_password)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'employee', false)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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

create table if not exists public.shift_confirmations (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (shift_id, user_id)
);

-- Add explicit FKs to profiles so PostgREST can join shift_responses/shift_confirmations -> profiles
-- (Avoids: "Could not find a relationship between 'shift_responses' and 'profiles'")

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'shift_responses_user_id_profiles_fkey') then
    alter table public.shift_responses
      add constraint shift_responses_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'shift_confirmations_user_id_profiles_fkey') then
    alter table public.shift_confirmations
      add constraint shift_confirmations_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_responses enable row level security;
alter table public.shift_confirmations enable row level security;

create or replace function public.is_manager(uid uuid)
returns boolean as $$
  select exists(select 1 from public.profiles p where p.id = uid and p.role = 'manager');
$$ language sql stable;

-- Profiles policies

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "profiles_select_manager_all" on public.profiles;
create policy "profiles_select_manager_all" on public.profiles
for select using (public.is_manager(auth.uid()));

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

drop policy if exists "shifts_delete_manager" on public.shifts;
create policy "shifts_delete_manager" on public.shifts
for delete using (public.is_manager(auth.uid()));

-- Responses policies

drop policy if exists "responses_select_own" on public.shift_responses;
create policy "responses_select_own" on public.shift_responses
for select using (auth.uid() = user_id);

drop policy if exists "responses_select_manager" on public.shift_responses;
create policy "responses_select_manager" on public.shift_responses
for select using (public.is_manager(auth.uid()));

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
