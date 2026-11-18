-- A single administrator-owned parent folder for all school folders.
-- Root is shared once with the Sheets Service Account. School folders inherit its permissions.
create table if not exists public.qlpm_drive_root (
 id integer primary key default 1 check (id=1),
 folder_id text not null unique check (folder_id ~ '^[A-Za-z0-9_-]{20,160}$'),
 folder_name text not null check (length(btrim(folder_name)) between 1 and 180),
 configured_by uuid references auth.users(id) on delete set null,
 verified_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
alter table public.qlpm_drive_root enable row level security;
drop policy if exists qlpm_drive_root_staff_read on public.qlpm_drive_root;
create policy qlpm_drive_root_staff_read on public.qlpm_drive_root
 for select to authenticated using (public.is_staff());
revoke all on table public.qlpm_drive_root from public,anon,authenticated;
grant select on public.qlpm_drive_root to authenticated;
-- The Edge Function alone, after verifying the admin session and Google Editor capability,
-- may create the root. Existing school links and school folders remain untouched.
