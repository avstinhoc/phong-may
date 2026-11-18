-- Keep the verified QLPM Drive root; templates and all school workbooks are direct children.
-- The folder was inspected and contains template "DS ĐIỂM DANH" and existing school spreadsheets.
-- No existing school_sheet_links, sheet tabs or files are altered.
insert into public.qlpm_drive_root (id,folder_id,folder_name,configured_by)
values (1,'1d8ZiM9q2xyxKNZwTSD5mN77fpVma-Nti','QLPM',null)
on conflict (id) do nothing;
