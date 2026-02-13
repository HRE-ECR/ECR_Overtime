# OvertimeHub v3.6.3 (Notes column fix)

## What was wrong
If `public.ot_requests` (or `public.shifts`) already existed from an earlier build, `create table if not exists ...` does NOT add new columns.
So when the v3.6 schema referenced `notes`, Supabase raised: `ERROR 42703: column "notes" does not exist`.

## Fix included
This build's `supabase/schema.sql` **always adds notes columns** using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` before any constraints/policies.

## Deploy
1) Run `supabase/schema.sql` in Supabase SQL editor.
2) Deploy your GitHub Pages project as usual.
