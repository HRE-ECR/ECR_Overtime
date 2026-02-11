# OvertimeHub – Approval-gated account flow (Email + Password)

## What changed
- Users self-signup with **email + password**.
- After login, users see **Awaiting Admin Approval** until a manager sets their profile role.
- Managers approve users in the **Admin Panel**.
- Password reset is available.

## GitHub Pages URL
https://hre-ecr.github.io/ECR_Overtime/

## Supabase Auth URL Configuration
Set:
- Site URL: https://hre-ecr.github.io/ECR_Overtime
- Redirect URLs:
  - https://hre-ecr.github.io/ECR_Overtime
  - https://hre-ecr.github.io/ECR_Overtime/*
  - https://hre-ecr.github.io/ECR_Overtime/reset-password
  - https://hre-ecr.github.io/ECR_Overtime/reset-password/*

## Note on Email Rate Limits
Supabase built-in email provider has strict rate limits. For production, set up Custom SMTP.

## Setup
1) Run `supabase/schema.sql` in Supabase SQL Editor.
2) Set GitHub secrets:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
3) Deploy to GitHub Pages via Actions.
