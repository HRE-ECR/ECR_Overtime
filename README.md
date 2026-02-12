# OvertimeHub v3.4 (Full)

## New features in this build
- **User Profile** tab for approved users: set display name (format `J. Surname`) and optional phone.
- **Team roster calendars** stored in Supabase as a 28-day repeating pattern (Team1–Team4) starting **Mon 2026-02-02**.
- Available Shifts has toggle **Show only rest days** (default ON). When ON, shows OT shifts only on your team’s roster rest days.
- **User Management** (manager) can set a user’s **Team** and **Band**.
- **Approve OT** shows requester’s **Band** and shows which manager approved/declined.
- UI polish: day/night emojis and improved wrapping.

## Supabase setup
1. Run `supabase/schema.sql` in Supabase SQL Editor.
2. Ensure Auth URL Configuration:
   - Site URL: https://hre-ecr.github.io/ECR_Overtime
   - Redirect URLs: https://hre-ecr.github.io/ECR_Overtime/*

## Deployment
Push to GitHub and GitHub Actions will build + deploy Pages.
