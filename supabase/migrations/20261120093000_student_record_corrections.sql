-- Audited, school-scoped correction of classroom rewards and violations.
-- Preserve original records / timestamps; protect existing confirmed incident reports.
-- All wallet totals and Top boards derive from student_records and update automatically.

create table if not exists public.student_record_corrections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  record_id uuid not null references public.student_records(id) on delete cascade,
  previous_data jsonb not null,
  corrected_data jsonb not null,
  reason text not null check (length(trim(reason)) between 5 and 500),
  corrected_by uuid not null references auth.users(id) on delete restrict,
  corrected_at timestamptz not null default now()
);
create index if not exists student_record_corrections_record_idx
  on public.student_record_corrections(record_id,corrected_at desc);
create index if not exists student_record_corrections_school_idx
  on public.student_record_corrections(school_id,corrected_at desc);

alter table public.student_record_corrections enable row level security;
drop policy if exists student_record_corrections_school_read on public.student_record_corrections;
create policy student_record_corrections_school_read
 on public.student_record_corrections for select to authenticated
 using (public.can_access_school(school_id));
revoke all on public.student_record_corrections from public,anon,authenticated;
grant select on public.student_record_corrections to authenticated;

-- Ledger mutation is only available through the audited RPC.
-- Existing student_records INSERT/SELECT and redemption RPC remain unchanged.
revoke update,delete on public.student_records from authenticated;

create or replace function public.ic3_correct_student_record(
  p_record_id uuid,
  p_student_id uuid,
  p_record_type text,
  p_title text,
  p_points numeric,
  p_record_date date,
  p_note text,
  p_reason text
) returns boolean
language plpgsql security definer
set search_path=public,pg_temp
as $correction$
declare
 v_actor uuid := auth.uid();
 v_old public.student_records%rowtype;
 v_new public.student_records%rowtype;
 v_before_old numeric;
 v_before_new numeric;
 v_after numeric;
 v_student uuid;
 v_count integer;
 v_threshold integer;
 v_reason text := trim(coalesce(p_reason,''));
 v_title text := trim(coalesce(p_title,''));
begin
 if v_actor is null then raise exception 'Bạn cần đăng nhập để sửa ghi nhận.'; end if;
 if not exists(
   select 1 from public.profiles p
   where p.id=v_actor and p.is_active=true and p.role in ('admin','teacher','staff')
 ) then raise exception 'Chỉ giáo viên hoặc quản trị viên được sửa ghi nhận.'; end if;
 if p_record_id is null or p_student_id is null then raise exception 'Thiếu mã ghi nhận hoặc học sinh.'; end if;
 if length(v_reason) not between 5 and 500 then raise exception 'Nhập lý do chỉnh sửa từ 5 đến 500 ký tự.'; end if;
 if length(v_title) not between 1 and 200 then raise exception 'Nội dung ghi nhận phải có 1–200 ký tự.'; end if;
 if p_record_date is null then raise exception 'Cần chọn ngày ghi nhận.'; end if;
 if p_record_type not in ('reward','violation','point') or p_record_type is null then
   raise exception 'Loại ghi nhận không hợp lệ.'; end if;
 if p_points is null or abs(p_points)>99999 then raise exception 'Số điểm/sao không hợp lệ.'; end if;
 if length(coalesce(p_note,''))>1500 then raise exception 'Ghi chú quá dài (tối đa 1500 ký tự).'; end if;

 select * into v_old
 from public.student_records
 where id=p_record_id for update;
 if not found then raise exception 'Ghi nhận không tồn tại.'; end if;
 if not public.can_access_school(v_old.school_id) then
   raise exception 'Bạn không có quyền chỉnh sửa ghi nhận của trường này.'; end if;
 if not exists(
   select 1 from public.students s
   where s.id=p_student_id and s.school_id=v_old.school_id and s.status='active'
 ) then raise exception 'Học sinh đích không thuộc trường đang chọn hoặc đã ngừng học.'; end if;

 -- Lock both students in deterministic order for balance and race safety.
 perform 1 from public.students s
 where s.id in (v_old.student_id,p_student_id) and s.school_id=v_old.school_id
 order by s.id for update;

 if v_old.star_event='recovery' then
   raise exception 'Không thể sửa trực tiếp lượt khôi phục lửa; liên hệ quản trị viên để đối soát.'; end if;
 if v_old.star_event='penalty' then
   if p_record_type<>'reward' or p_points>-2 or trunc(p_points)<>p_points then
     raise exception 'Ghi nhận phạt phải giữ loại Trừ sao và ít nhất 2 sao nguyên.'; end if;
 elsif v_old.record_type='reward' and v_old.points<0 then
   if p_record_type<>'reward' or p_points>-2 or trunc(p_points)<>p_points then
     raise exception 'Đổi quà phải giữ mức trừ tối thiểu 2 sao nguyên.'; end if;
 elsif p_record_type='reward' then
   if p_points<1 or trunc(p_points)<>p_points then
     raise exception 'Sao thưởng phải là số nguyên dương.'; end if;
 end if;
 if p_record_type='violation' then
   if p_points<>0 or lower(v_title) in ('mất trật tự','lỗi mất trật tự') then
     raise exception 'Lỗi chính thức có 0 điểm; dùng ghi nhận phạt để trừ sao.'; end if;
 end if;

 -- Do not silently rewrite evidence used in a teacher-confirmed report.
 if (v_old.record_type='violation' or p_record_type='violation')
   and exists (
     select 1 from public.student_incident_reports ir
     where ir.school_id=v_old.school_id and ir.student_id in (v_old.student_id,p_student_id)
       and ir.status='confirmed'
   ) then raise exception 'Học sinh có biên bản đã xác nhận. Cần đối soát biên bản trước khi sửa lỗi.'; end if;

 select coalesce(sum(r.points),0) into v_before_old
 from public.student_records r where r.school_id=v_old.school_id
   and r.student_id=v_old.student_id and r.record_type='reward';
 if p_student_id<>v_old.student_id then
   select coalesce(sum(r.points),0) into v_before_new
   from public.student_records r where r.school_id=v_old.school_id
     and r.student_id=p_student_id and r.record_type='reward';
 end if;

 update public.student_records r
 set student_id=p_student_id,record_type=p_record_type,title=v_title,
   points=p_points,record_date=p_record_date,note=left(coalesce(p_note,''),1500)
 where r.id=p_record_id
 returning * into v_new;

 -- Avoid removing already-spent awards / creating an unbacked redemption.
 -- Genuine "Mất trật tự" penalties may legitimately take an account below 0.
 if v_old.star_event is distinct from 'penalty' then
   select coalesce(sum(r.points),0) into v_after
   from public.student_records r where r.school_id=v_old.school_id
     and r.student_id=v_old.student_id and r.record_type='reward';
   if v_after<least(0,v_before_old) then
     raise exception 'Không thể sửa: học sinh cũ đã dùng số sao này để đổi quà.'; end if;
   if p_student_id<>v_old.student_id then
     select coalesce(sum(r.points),0) into v_after
     from public.student_records r where r.school_id=v_old.school_id
       and r.student_id=p_student_id and r.record_type='reward';
     if v_after<least(0,v_before_new) then
       raise exception 'Không thể sửa: học sinh mới không đủ số sao khả dụng.'; end if;
   end if;
 end if;

 insert into public.student_record_corrections(
   school_id,record_id,previous_data,corrected_data,reason,corrected_by
 ) values (v_old.school_id,p_record_id,to_jsonb(v_old),to_jsonb(v_new),v_reason,v_actor);

 -- Rebuild draft incident milestones from the corrected violation ledger.
 -- Confirmed reports are never deleted or rewritten.
 if v_old.record_type='violation' or v_new.record_type='violation' then
   delete from public.student_incident_reports
   where school_id=v_old.school_id
     and student_id in (v_old.student_id,p_student_id) and status='draft';
   select violation_report_threshold into v_threshold
   from public.schools where id=v_old.school_id;
   v_threshold:=greatest(coalesce(v_threshold,3),1);
   for v_student in select distinct x.student_id from
     (values (v_old.student_id),(p_student_id)) as x(student_id) loop
     select count(*) into v_count
     from public.student_records r
     where r.school_id=v_old.school_id and r.student_id=v_student
       and r.record_type='violation'
       and lower(trim(r.title)) not in ('mất trật tự','lỗi mất trật tự');
     insert into public.student_incident_reports(
       school_id,student_id,milestone,violation_count
     )
     select v_old.school_id,v_student,g.milestone,v_threshold*g.milestone
     from generate_series(1,least(500,v_count/v_threshold)) as g(milestone)
     on conflict (student_id,milestone) do nothing;
   end loop;
 end if;
 return true;
end;
$correction$;

revoke all on function public.ic3_correct_student_record(uuid,uuid,text,text,numeric,date,text,text) from public,anon;
grant execute on function public.ic3_correct_student_record(uuid,uuid,text,text,numeric,date,text,text) to authenticated;
