# OvertimeHub v3.3

## Changes in this build
- Fixes RLS error when employee cancels then requests same shift again:
  - App uses UPDATE-first then INSERT.
  - Added RLS policy `ot_update_own_request` to allow setting status back to `requested`.
- Approve OT tab: Approved names are green with green border; declined names red with red border.

## Supabase
Run `supabase/schema.sql` in Supabase SQL Editor.

## GitHub Pages
Upload to your repo and push to `main`. GitHub Actions builds and deploys.
