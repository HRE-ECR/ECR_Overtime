# OvertimeHub v3.6 (FIXED)

## What’s fixed
- Supabase SQL error: `syntax error at or near "select"` on the `cron.schedule(...)` line.

### Why it happened
The old schema used nested dollar quoting: a `DO $$ ... $$;` block containing `$$select ...$$`.
Postgres treats the inner `$$` as the end of the outer string, then sees a raw `select` token -> syntax error.

### What changed
The schedule command is now passed as a normal string:

```sql
PERFORM cron.schedule('oh_cleanup_old_shift_data', '0 3 * * *', 'select public.cleanup_old_shift_data(50);');
```

## Deploy
1. Run `supabase/schema.sql` in Supabase SQL Editor.
2. Push this repo to GitHub and let Actions deploy Pages.
