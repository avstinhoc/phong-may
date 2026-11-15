create or replace function public.approve_registration(registration_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare r student_registrations; c classes; p computers; sid uuid;
begin
 select * into r from student_registrations where id=registration_id for update;
 if not found or r.status <> 'pending' then raise exception 'Đăng ký không còn chờ duyệt'; end if;
 select * into c from classes where registration_code=r.registration_code;
 if not public.can_access_school(c.school_id) then raise exception 'Không có quyền duyệt lớp này'; end if;
 if nullif(trim(r.computer_code),'') is not null then
  select * into p from computers where school_id=c.school_id and computer_code=upper(trim(r.computer_code)) for update;
  if not found then raise exception 'Không tìm thấy máy đăng ký'; end if;
  if p.status in ('broken','maintenance') then raise exception 'Máy đang hỏng hoặc bảo trì. Đổi máy trước khi duyệt.'; end if;
  if (select count(*) from computer_assignments where computer_id=p.id and active) >= p.capacity then raise exception 'Máy đã đủ chỗ. Đổi máy trước khi duyệt.'; end if;
 end if;
 insert into students(school_id,class_id,class_name,school_name,full_name,student_code,phone,status,created_by)
 values(c.school_id,c.id,c.class_name,(select name from schools where id=c.school_id),r.full_name,r.student_code,r.phone,'active',auth.uid()) returning id into sid;
 if p.id is not null then insert into computer_assignments(school_id,computer_id,student_id) values(c.school_id,p.id,sid); end if;
 update student_registrations set status='approved' where id=r.id;
 return sid;
end $$;
revoke all on function public.approve_registration(uuid) from public,anon;
grant execute on function public.approve_registration(uuid) to authenticated;

create or replace function public.save_roll_call(target_session uuid, entries jsonb) returns integer language plpgsql security definer set search_path=public as $$
declare lesson class_sessions; item jsonb; sid uuid; state text; n integer:=0;
begin
 select * into lesson from class_sessions where id=target_session for update;
 if not found or not public.can_access_school(lesson.school_id) then raise exception 'Không có quyền điểm danh buổi học'; end if;
 if jsonb_typeof(entries) <> 'array' or jsonb_array_length(entries)>500 then raise exception 'Danh sách không hợp lệ'; end if;
 for item in select value from jsonb_array_elements(entries) loop
  sid := (item->>'student_id')::uuid; state:=item->>'status';
  if state is null or state not in ('present','absent','late','excused') then raise exception 'Trạng thái không hợp lệ'; end if;
  if not exists(select 1 from students s where s.id=sid and s.school_id=lesson.school_id and s.status='active' and
    ((lesson.class_id is not null and s.class_id=lesson.class_id) or ((lesson.class_id is null or s.class_id is null) and s.class_name=lesson.class_name))
    and exists(select 1 from computer_assignments a where a.student_id=s.id and a.active)) then raise exception 'Học sinh chưa đăng ký máy hoặc không thuộc lớp'; end if;
  update attendance set status=state,note=left(coalesce(item->>'note',''),1000) where session_id=target_session and student_id=sid;
  if not found then insert into attendance(school_id,session_id,student_id,status,note) values(lesson.school_id,target_session,sid,state,left(coalesce(item->>'note',''),1000)); end if;
  n:=n+1;
 end loop;
 return n;
end $$;
revoke all on function public.save_roll_call(uuid,jsonb) from public,anon;
grant execute on function public.save_roll_call(uuid,jsonb) to authenticated;
