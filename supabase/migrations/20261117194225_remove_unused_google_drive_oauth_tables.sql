-- Roll back the retired QLPM Google Drive OAuth for personal Sheets.
-- Only the dedicated OAuth state and encrypted refresh-token tables are removed.
-- Existing school links, tabs, students, scores, sessions and Google Auth sign-in remain unchanged.
drop table if exists public.google_oauth_states;
drop table if exists public.google_drive_connections;
