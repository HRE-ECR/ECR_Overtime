# Fix: column "notes" does not exist

This error appears when your app/schema references `ot_requests.notes` but the column was never added (because the table already existed).

## Quick fix
Run the SQL in `supabase/schema.sql`.

## Full build note
This zip is provided to deliver the schema fix. If you need me to re-issue the entire v3.6 project bundle with the fix merged, tell me and upload your current repo zip (or paste your current schema.sql) so I can rebuild without losing any files.
