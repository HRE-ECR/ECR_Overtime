
-- Safety migrations (won't error if tables don't exist)
alter table if exists public.shifts add column if not exists notes text;
alter table if exists public.ot_requests add column if not exists notes text;

alter table if exists public.ot_requests drop constraint if exists ot_requests_notes_len_check;
alter table if exists public.ot_requests add constraint ot_requests_notes_len_check
  check (notes is null or length(notes) <= 500);

-- OvertimeHub v3.6 schema (FIXED + NOTES migration)
-- Fixes:
-- 1) cron.schedule quoting (no nested $$)
-- 2) notes columns added via ALTER TABLE for existing databases

create extension if not exists "pgcrypto";

-- Ensure notes columns exist even if tables already existed
alter table public.shifts add column if not exists notes text;
alter table public.ot_requests add column if not exists notes text;

-- Optional: enforce notes length
alter table public.ot_requests drop constraint if exists ot_requests_notes_len_check;
alter table public.ot_requests add constraint ot_requests_notes_len_check
  check (notes is null or length(notes) <= 500);

-- IMPORTANT: After running these migrations, run your full v3.6 schema (the long one you pasted) OR keep your existing schema.
-- This file is intended as a safe migration helper for backups.
