# OvertimeHub v3.6 (Full)

## Changes in this build
- Approve OT date format improved to `Mon 2 Feb`.
- My Shifts:
  - Approved tiles are green, declined/cancelled tiles red.
  - Button to hide ALL declined/cancelled from view (archives them).
- Available Shifts:
  - Notes button (after requesting) opens modal to save notes (max 500 chars) to Supabase.
- Reports:
  - Export APPROVED CSV with columns: Date, Shift, Name, Team, Band, Approved by, Notes.
- Data retention:
  - Adds `cleanup_old_shift_data(50)` function to delete shift-related data older than 50 days.
  - Attempts to schedule daily cleanup via pg_cron if available.
- Test Functions:
  - Toggle in User Management to show/hide Available Shifts and My Shifts tabs for managers.

## Supabase
Run `supabase/schema.sql` in Supabase SQL Editor.

## Deploy
Push this folder to your GitHub repo and GitHub Actions will deploy.
