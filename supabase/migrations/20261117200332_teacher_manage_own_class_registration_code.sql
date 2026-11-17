-- Teachers can edit and archive ONLY their own class registration code.
-- Existing student/attendance/scores/lesson data is preserved.
create or replace function public.ic3_manage_class_registration(
  p_class_id uuid,
  p_action text,
  p_confirmation text default null,
  p_new_code text default null
) returns public.classes
language plpgsql security definer set search_path = ''
as $function$
declare
  c public.classes%rowtype;
  requested text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active
      and p.role in ('admin','teacher','staff')
  ) then
    raise exception 'Tài khoản không có quyền quản lý mã đăng ký';
  end if;

  select * into c from public.classes
   where id=p_class_id for update;
  if not found or c.created_by is distinct from auth.uid()
     or not public.can_access_school(c.school_id) then
    raise exception 'Chỉ người tạo lớp mới được sửa hoặc ngừng mã đăng ký';
  end if;

  if p_action = 'edit' then
    if c.archived_at is not null then
      raise exception 'Mã đã ngừng sử dụng; hãy khôi phục trước khi sửa';
    end if;
    requested := upper(trim(coalesce(p_new_code,'')));
    if length(requested) not between 8 and 64
       or requested !~ '^IC3-[A-Z0-9]+-[A-Z0-9.]+(-[0-9]+)?$' then
      raise exception 'Mã phải có dạng IC3-DUYTAN-6.1, tối đa 64 ký tự, không có dấu hoặc khoảng trắng';
    end if;
    if exists (select 1 from public.classes other
      where other.id <> c.id and (other.registration_code = requested
      or requested = any(other.legacy_registration_codes))) then
      raise exception 'Mã đăng ký đã được dùng bởi lớp khác';
    end if;
    if requested <> c.registration_code then
      update public.classes set registration_code=requested
       where id=c.id returning * into c;
    end if;
  elsif p_action='archive' or p_action='restore' then
    if p_confirmation is distinct from c.class_name then
      raise exception 'Hãy nhập đúng tên lớp để xác nhận';
    end if;
    update public.classes
       set archived_at=case when p_action='restore' then null else now() end
     where id=c.id returning * into c;
  else
    raise exception 'Thao tác mã đăng ký không hợp lệ';
  end if;
  return c;
end;
$function$;
revoke all on function public.ic3_manage_class_registration(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.ic3_manage_class_registration(uuid,text,text,text) to authenticated;
comment on function public.ic3_manage_class_registration(uuid,text,text,text) is
  'Authenticated active class creator only; edit or archive/restore a registration code without removing class/student data.';
