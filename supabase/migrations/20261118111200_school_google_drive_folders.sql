-- One Google Drive folder per school, shared once with the QLPM Service Account.
-- Existing school_sheet_links and school_sheet_tabs are not modified or deleted.
create table if not exists public.school_drive_folders (
 school_id uuid primary key references public.schools(id) on delete cascade,
 folder_id text not null unique check (folder_id ~ '^[A-Za-z0-9_-]{20,160}$'),
 folder_name text not null check (length(trim(folder_name)) between 1 and 180),
 configured_by uuid references auth.users(id) on delete set null,
 verified_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
alter table public.school_drive_folders enable row level security;
drop policy if exists school_drive_folders_school_read on public.school_drive_folders;
create policy school_drive_folders_school_read on public.school_drive_folders
 for select to authenticated
 using (public.is_staff() and public.can_access_school(school_id));
revoke all on public.school_drive_folders from anon,authenticated;
grant select on public.school_drive_folders to authenticated;
-- Only the authenticated Edge Function can add or change links after verifying
-- the file is in the verified folder. Keep existing links untouched.
drop policy if exists sheet_links_own_insert on public.school_sheet_links;
