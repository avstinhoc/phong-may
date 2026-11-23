-- List pending student-PC changes for the teacher responsible for the class.
-- No public table grants or student PINs are exposed.
create or replace function public.qlpm_teacher_student_pc_pending(p_school_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.can_access_school(p_school_id) then
  raise exception 'Bạn không có quyền xem yêu cầu PC của trường này.';
 end if;
 return coalesce((
  select jsonb_agg(jsonb_build_object(
    'id',pr.id,'student_id',pr.student_id,'student_name',st.full_name,
    'class_name',cl.class_name,'requested_pc',pc.computer_code,
    'current_pc',(select oldpc.computer_code
      from public.computer_assignments a
      join public.computers oldpc on oldpc.id=a.computer_id
      where a.student_id=st.id and a.school_id=st.school_id
        and a.active=true and a.released_at is null
      order by a.created_at desc limit 1),
    'requested_at',pr.created_at,'pc_status',pc.status,
    'reviewable',(public.is_admin() or cl.created_by=auth.uid())
  ) order by pr.created_at)
  from public.qlpm_student_desktop_pc_requests pr
  join public.students st on st.id=pr.student_id
    and st.school_id=pr.school_id and st.status='active'
  left join public.qlpm_student_web_credentials cr on cr.student_id=st.id
  join public.classes cl on cl.id=coalesce(cr.class_id,st.class_id)
    and cl.school_id=st.school_id
  join public.computers pc on pc.id=pr.computer_id and pc.school_id=pr.school_id
  where pr.school_id=p_school_id and pr.status='pending'
    and (public.is_admin() or cl.created_by=auth.uid())
 ),'[]'::jsonb);
end $$;
revoke all on function public.qlpm_teacher_student_pc_pending(uuid) from public,anon;
grant execute on function public.qlpm_teacher_student_pc_pending(uuid) to authenticated;

-- Accept PC21, pc021, or just 21; do not create duplicate outstanding requests.
create or replace function public.qlpm_student_desktop_request_pc(
 p_session_token text,p_pc text,p_device_id text
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 who jsonb;
 sid uuid; school uuid;
 normalized text;
 pc public.computers%rowtype;
begin
 who:=public.qlpm_student_desktop_whoami(p_session_token);
 if who is null then
  return jsonb_build_object('ok',false,'message','Phiên đăng nhập đã hết hạn.'); end if;
 sid:=(who->>'student_id')::uuid;
 school:=(who->>'school_id')::uuid;
 begin
  normalized:=public.ic3_normalize_pc(p_pc);
 exception when others then
  return jsonb_build_object('ok',false,'message','Mã máy không hợp lệ. Nhập PC1, PC21 hoặc số 21.');
 end;
 if normalized is null then
  return jsonb_build_object('ok',false,'message','Hãy nhập số máy muốn kết nối.'); end if;
 select * into pc from public.computers
  where school_id=school and upper(computer_code)=normalized limit 1;
 if pc.id is null then
  return jsonb_build_object('ok',false,'message','PC này chưa được tạo trong trường.'); end if;
 if pc.status in ('broken','maintenance') then
  return jsonb_build_object('ok',false,'message','PC đang hỏng hoặc bảo trì; hãy chọn máy khác.'); end if;
 if exists(select 1 from public.computer_assignments a
   where a.school_id=school and a.student_id=sid and a.computer_id=pc.id
     and a.active=true and a.released_at is null) then
  return jsonb_build_object('ok',false,'message','Em đã được liên kết với PC này.'); end if;
 if exists(select 1 from public.qlpm_student_desktop_pc_requests
   where student_id=sid and status='pending') then
  return jsonb_build_object('ok',false,'message',
    'Em đang có yêu cầu PC chờ giáo viên duyệt. Hãy chờ giáo viên xử lý trước khi gửi yêu cầu mới.');
 end if;
 insert into public.qlpm_student_desktop_pc_requests
   (student_id,school_id,computer_id,device_id)
 values(sid,school,pc.id,left(coalesce(p_device_id,''),128));
 return jsonb_build_object('ok',true,
   'message','Đã gửi yêu cầu đổi PC. Giáo viên sẽ duyệt trước khi thay đổi.');
end $$;
revoke all on function public.qlpm_student_desktop_request_pc(text,text,text) from public;
grant execute on function public.qlpm_student_desktop_request_pc(text,text,text) to anon,authenticated;

-- Review is restricted to the student's class teacher or administrator, not
-- every member of the school. Preserve the history on successful transfer.
create or replace function public.qlpm_teacher_review_pc_request(
 p_request_id uuid,p_approve boolean default true
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 req public.qlpm_student_desktop_pc_requests%rowtype;
 pc public.computers%rowtype;
 pupil public.students%rowtype;
 teacher_class public.classes%rowtype;
 occupied integer;
begin
 if auth.uid() is null then raise exception 'Cần đăng nhập giáo viên.'; end if;
 select * into req from public.qlpm_student_desktop_pc_requests
  where id=p_request_id and status='pending' for update;
 if req.id is null or not public.can_access_school(req.school_id) then
  raise exception 'Không có quyền xét duyệt yêu cầu PC.'; end if;
 select * into pupil from public.students
  where id=req.student_id and school_id=req.school_id and status='active' for update;
 if pupil.id is null then raise exception 'Học sinh không còn hoạt động.'; end if;
 select * into teacher_class from public.classes cl
  where cl.id=coalesce(
   (select cr.class_id from public.qlpm_student_web_credentials cr
    where cr.student_id=pupil.id),pupil.class_id)
   and cl.school_id=req.school_id;
 if teacher_class.id is null or not (public.is_admin() or teacher_class.created_by=auth.uid()) then
  raise exception 'Chỉ giáo viên chủ lớp hoặc quản trị viên được xét duyệt PC.'; end if;
 select * into pc from public.computers
  where id=req.computer_id and school_id=req.school_id for update;
 if pc.id is null or pc.status in ('broken','maintenance') then
  raise exception 'Máy không khả dụng.'; end if;
 if p_approve then
  select count(*) into occupied from public.computer_assignments a
   where a.computer_id=pc.id and a.student_id<>pupil.id
    and a.active=true and a.released_at is null;
  if occupied>=pc.capacity then
   raise exception 'Máy đã đủ chỗ; chưa thay đổi máy cũ.'; end if;
  update public.computer_assignments
   set active=false,released_at=now()
   where student_id=pupil.id and active=true and released_at is null
    and computer_id<>pc.id;
  if not exists(select 1 from public.computer_assignments a
   where a.student_id=pupil.id and a.computer_id=pc.id
    and a.active=true and a.released_at is null) then
   insert into public.computer_assignments
    (school_id,computer_id,student_id,assigned_date,active)
    values(req.school_id,pc.id,pupil.id,current_date,true);
  end if;
  update public.qlpm_student_desktop_pc_requests
   set status='rejected',reviewed_at=now(),reviewed_by=auth.uid()
   where student_id=pupil.id and id<>req.id and status='approved';
 end if;
 update public.qlpm_student_desktop_pc_requests
  set status=case when p_approve then 'approved' else 'rejected' end,
   reviewed_at=now(),reviewed_by=auth.uid()
  where id=req.id;
 return jsonb_build_object('ok',true,'approved',p_approve);
end $$;
revoke all on function public.qlpm_teacher_review_pc_request(uuid,boolean) from public,anon;
grant execute on function public.qlpm_teacher_review_pc_request(uuid,boolean) to authenticated;
