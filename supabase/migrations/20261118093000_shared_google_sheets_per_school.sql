-- One shared workbook per school; collaborators must be authorized members of that school.
-- Existing links in other schools remain untouched.
create unique index if not exists school_sheet_links_one_per_school on public.school_sheet_links(school_id);

drop policy if exists sheet_links_own_read on public.school_sheet_links;
create policy sheet_links_own_read on public.school_sheet_links for select to authenticated
using (public.is_staff() and public.can_access_school(school_id));

drop policy if exists sheet_links_own_update on public.school_sheet_links;
create policy sheet_links_own_update on public.school_sheet_links for update to authenticated
using (public.is_staff() and public.can_access_school(school_id) and
 (owner_id=(select auth.uid()) or public.is_admin()))
with check (public.is_staff() and public.can_access_school(school_id) and
 (owner_id=(select auth.uid()) or public.is_admin()));

drop policy if exists sheet_links_own_delete on public.school_sheet_links;
create policy sheet_links_own_delete on public.school_sheet_links for delete to authenticated
using (public.is_staff() and public.can_access_school(school_id) and
 (owner_id=(select auth.uid()) or public.is_admin()));

drop policy if exists sheet_tabs_own_read on public.school_sheet_tabs;
create policy sheet_tabs_own_read on public.school_sheet_tabs for select to authenticated
using (exists(select 1 from public.school_sheet_links l where l.id=link_id
 and public.is_staff() and public.can_access_school(l.school_id)));
drop policy if exists sheet_tabs_own_insert on public.school_sheet_tabs;
create policy sheet_tabs_own_insert on public.school_sheet_tabs for insert to authenticated
with check (exists(select 1 from public.school_sheet_links l where l.id=link_id
 and public.is_staff() and public.can_access_school(l.school_id)));
drop policy if exists sheet_tabs_own_update on public.school_sheet_tabs;
create policy sheet_tabs_own_update on public.school_sheet_tabs for update to authenticated
using (exists(select 1 from public.school_sheet_links l where l.id=link_id
 and public.is_staff() and public.can_access_school(l.school_id)))
with check (exists(select 1 from public.school_sheet_links l where l.id=link_id
 and public.is_staff() and public.can_access_school(l.school_id)));
drop policy if exists sheet_tabs_own_delete on public.school_sheet_tabs;
create policy sheet_tabs_own_delete on public.school_sheet_tabs for delete to authenticated
using (exists(select 1 from public.school_sheet_links l where l.id=link_id
 and public.is_staff() and public.can_access_school(l.school_id)));

-- Never attach the source template to a school or reuse one school's workbook
-- for another school. The author/school identity of an existing link is immutable.
create or replace function public.protect_shared_school_sheet_link()
returns trigger language plpgsql security definer set search_path='' as $$
declare check_new boolean:=false;
begin
 if TG_OP='INSERT' then
   check_new:=true;
 elsif TG_OP='UPDATE' then
   if new.school_id is distinct from old.school_id or new.owner_id is distinct from old.owner_id then
     raise exception 'Không được thay đổi trường hoặc chủ liên kết Google Sheets';
   end if;
   check_new:=new.spreadsheet_id is distinct from old.spreadsheet_id;
 end if;
 if check_new then
   if new.spreadsheet_id='1zxht2Ft4mr6DEkycI--wXqZJbXLRJ-8iHtVc64horpM' then
     raise exception 'Không liên kết file mẫu trống trực tiếp. Hãy tạo bản sao của trường.';
   end if;
   if exists(select 1 from public.school_sheet_links other
      where other.spreadsheet_id=new.spreadsheet_id
        and other.school_id<>new.school_id and other.id<>new.id) then
     raise exception 'File Sheets đã được dùng ở trường khác. Hãy tạo bản sao riêng cho trường.';
   end if;
 end if;
 return new;
end $$;
drop trigger if exists protect_shared_school_sheet_link on public.school_sheet_links;
create trigger protect_shared_school_sheet_link before insert or update
on public.school_sheet_links for each row execute function public.protect_shared_school_sheet_link();
