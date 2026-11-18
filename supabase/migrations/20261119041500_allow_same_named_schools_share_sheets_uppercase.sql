-- QLPM: reuse one attendance workbook for entries denoting the SAME school.
-- Historical school rows from different teacher accounts may have different UUIDs.
-- Preserve all rows, class data, and their existing Google Sheet links.
-- Distinct school names remain isolated; never make Google Drive public.

create or replace function public.qlpm_school_name_key(p_name text)
returns text language sql immutable
set search_path=pg_catalog,pg_temp
as $key$
  select upper(regexp_replace(btrim(coalesce(p_name,'')),'[[:space:]]+',' ','g'))
$key$;

create or replace function public.protect_shared_school_sheet_link()
returns trigger language plpgsql security definer
set search_path=''
as $body$
declare
  check_new boolean:=false;
  new_school_name text;
begin
 if tg_op='INSERT' then
   check_new:=true;
 elsif tg_op='UPDATE' then
   if new.school_id is distinct from old.school_id or
      new.owner_id is distinct from old.owner_id then
     raise exception 'Không được thay đổi trường hoặc chủ liên kết Google Sheets';
   end if;
   check_new:=new.spreadsheet_id is distinct from old.spreadsheet_id;
 end if;
 if check_new then
   if new.spreadsheet_id='1zxht2Ft4mr6DEkycI--wXqZJbXLRJ-8iHtVc64horpM' then
     raise exception 'Không liên kết file mẫu trống trực tiếp. Hãy tạo bản sao của trường.';
   end if;
   select public.qlpm_school_name_key(name) into new_school_name
   from public.schools where id=new.school_id;
   if new_school_name is null or new_school_name='' then
     raise exception 'Không xác minh được trường cần liên kết Google Sheets';
   end if;
   if exists(
     select 1 from public.school_sheet_links other
     left join public.schools existing on existing.id=other.school_id
     where other.spreadsheet_id=new.spreadsheet_id
       and other.school_id<>new.school_id
       and other.id<>new.id
       and (
         existing.id is null or
         public.qlpm_school_name_key(existing.name)<>new_school_name
       )
   ) then
     raise exception 'File Sheets thuộc một trường khác tên. Chỉ các hồ sơ CÙNG trường mới được dùng chung.';
   end if;
 end if;
 return new;
end
$body$;

-- Always normalize school names when any app screen, import or RPC writes them.
create or replace function public.qlpm_uppercase_school_name()
returns trigger language plpgsql
set search_path=''
as $uppercase$
begin
 new.name:=public.qlpm_school_name_key(new.name);
 if new.name='' or length(new.name)>200 then
   raise exception 'Tên trường phải từ 1 đến 200 ký tự';
 end if;
 return new;
end
$uppercase$;

drop trigger if exists qlpm_uppercase_school_name on public.schools;
create trigger qlpm_uppercase_school_name
before insert or update of name on public.schools
for each row execute function public.qlpm_uppercase_school_name();

-- Preserve original staff authorization and per-user reuse behavior.
create or replace function public.create_my_school(school_name text)
returns uuid language plpgsql security definer set search_path=public
as $school$
declare sid uuid; clean text:=public.qlpm_school_name_key(school_name);
begin
 if not public.is_staff() then raise exception 'Tài khoản chưa được cấp quyền'; end if;
 if clean is null or length(clean) not between 1 and 200 then
   raise exception 'Tên trường phải từ 1 đến 200 ký tự';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select s.id into sid from public.schools s
 join public.school_members m on m.school_id=s.id
 where m.user_id=auth.uid()
   and public.qlpm_school_name_key(s.name)=clean
 order by s.created_at limit 1;
 if sid is null then
   insert into public.schools(name) values(clean) returning id into sid;
   insert into public.school_members values(sid,auth.uid());
 end if;
 return sid;
end
$school$;

create or replace function public.rename_my_school(p_school_id uuid,p_new_name text)
returns void language plpgsql security definer set search_path=''
as $rename$
declare v_name text:=public.qlpm_school_name_key(p_new_name);
begin
 if not public.is_staff() or not public.can_access_school(p_school_id) then
   raise exception 'Bạn không có quyền sửa trường này';
 end if;
 if v_name is null or length(v_name) not between 1 and 200 then
   raise exception 'Tên trường không hợp lệ';
 end if;
 update public.schools set name=v_name where id=p_school_id;
 if not found then raise exception 'Không tìm thấy trường'; end if;
 update public.students set school_name=v_name where school_id=p_school_id;
 update public.profiles set school_name=v_name where school_id=p_school_id;
end
$rename$;
