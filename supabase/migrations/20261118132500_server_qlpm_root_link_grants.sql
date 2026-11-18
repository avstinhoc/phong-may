-- QLPM Sheets: the browser can read a verified root, but the Edge Function's
-- service_role lacked SELECT; this caused a false "not configured" error.
-- The same role also lacked INSERT on school_sheet_links after direct user inserts
-- were revoked. Restore only server-side privileges; never grant anon/user writes.
grant select, insert, update on table public.qlpm_drive_root to service_role;
grant insert on table public.school_sheet_links to service_role;

-- Confirm the two tables remain protected from anonymous and ordinary user writes.
revoke insert, update, delete on table public.qlpm_drive_root from anon, authenticated;
revoke insert on table public.school_sheet_links from anon, authenticated;
