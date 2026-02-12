# OvertimeHub v3.5 (Full)

## Fixes
- Fixes "profiles.phone does not exist" by adding migration to create `profiles.phone`.
- Fixes Approve OT embed ambiguity by using explicit relationships to profiles and fetching user staffing separately.

## New changes
- Employees can set their own Team and Band in User Profile.
- My Shifts has a toggle to show only approved requests.
- User Management dropdown displays: `J. Surname (employee)`.

## Supabase
Run `supabase/schema.sql` in Supabase SQL Editor.

## Deploy
Upload to GitHub repo and push to main. GitHub Actions will deploy to Pages.
