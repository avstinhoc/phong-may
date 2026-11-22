-- Approving a new PC transfers the student's active seat in one transaction.
-- Historical assignments are released, never deleted. A rejected request changes no seat.
create or replace function public.qlpm_teacher_review_pc_request(
 p_request_id uuid, p_approve boolean default true
) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare
 req public.qlpm_student_desktop_pc_requests%rowtype;
 pc public.computers%rowtype;
 pupil public.students%rowtype;
 occupied integer;
begin
 if auth.uid() is null then raise exception 'Cần đăng nhập giáo viên.'; end if;
 select * into req from public.qlpm_student_desktop_pc_requests
  where id=p_request_id and status='pending' for update;
 if req.id is null or not public.can_access_school(req.school_id) then
  raise exception 'Không có quyền xét duyệt máy.'; end if;
 select * into pupil from public.students
  where id=req.student_id and school_id=req.school_id and status='active' for update;
 if pupil.id is null then raise exception 'Học sinh không còn hoạt động.'; end if;
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
