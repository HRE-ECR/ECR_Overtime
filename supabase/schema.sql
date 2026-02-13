-- OvertimeHub v3.6 schema (NOTES column fix)
-- This script fixes: ERROR 42703 column "notes" does not exist

-- If you already have the rest of the schema, you can run ONLY the section below.

alter table public.ot_requests add column if not exists notes text;

-- Optional: ensure notes length constraint exists
alter table public.ot_requests drop constraint if exists ot_requests_notes_len_check;
alter table public.ot_requests add constraint ot_requests_notes_len_check
  check (notes is null or length(notes) <= 500);
