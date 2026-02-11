# OvertimeHub v3.1

## Changes
- Users can now cancel **approved** OT requests (status becomes cancelled).
- Added **Shift History Log** for managers (audit_log).
- Fixed OT counts by using an `ot_shift_counts` table updated by triggers.

## Deploy
GitHub Pages: https://hre-ecr.github.io/ECR_Overtime/

## Supabase
Run `supabase/schema.sql` in SQL Editor.

Auth URLs:
- Site URL: https://hre-ecr.github.io/ECR_Overtime
- Redirect URLs:
  - https://hre-ecr.github.io/ECR_Overtime/*
  - https://hre-ecr.github.io/ECR_Overtime/reset-password*
