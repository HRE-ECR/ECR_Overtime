# OvertimeHub v3.2 (Full)

## New changes included
- Report tab: **Export APPROVED (Grouped)** by date + day/night with names in one row.
- Managers: **Modify Shifts** tab (increase slots, soft delete). Deleting a shift sets linked requested/approved OT to **DECLINED**.
- Employees: **Hide past history** (archive) for OT items only after shift date.
- Approve OT: requests are listed **first come first served** (requested_at ascending).

## Supabase
Run `supabase/schema.sql` in Supabase SQL Editor.

Auth URL Configuration:
- Site URL: https://hre-ecr.github.io/ECR_Overtime
- Redirect URLs:
  - https://hre-ecr.github.io/ECR_Overtime/*
  - https://hre-ecr.github.io/ECR_Overtime/reset-password*

## GitHub Pages
Upload this project to your repo and let GitHub Actions deploy.
