-- Teacher-edited totals are additive CORRECTIONS, never destructive rewrites of attendance,
-- reward, redemption, flame or violation records. Future entries continue to accumulate.
create table if not exists public.ic3_student_stat_offsets(
 school_id uuid not null references public.schools(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 earned_delta integer not null default 0,
 available_delta integer not null default 0,
 violation_delta integer not null default 0,
 changed_by uuid references auth.users(id) on delete set null,
 changed_at timestamptz not null default now(),
 primary key (school_id,student_id)
);
alter table public.ic3_student_stat_offsets enable row level security;
drop policy if exists ic3_student_stat_offsets_school_read on public.ic3_student_stat_offsets;
create policy ic3_student_stat_offsets_school_read
 on public.ic3_student_stat_offsets for select to authenticated
 using (public.can_access_school(school_id));
revoke all on public.ic3_student_stat_offsets from public,anon,authenticated;
grant select on public.ic3_student_stat_offsets to authenticated;

create table if not exists public.ic3_student_stat_audit(
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.schools(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 before_totals jsonb not null,
 after_totals jsonb not null,
 reason text not null check (length(trim(reason)) between 5 and 500),
 changed_by uuid references auth.users(id) on delete set null,
 changed_at timestamptz not null default now()
);
create index if not exists ic3_student_stat_audit_lookup_idx
 on public.ic3_student_stat_audit(school_id,student_id,changed_at desc);
alter table public.ic3_student_stat_audit enable row level security;
drop policy if exists ic3_student_stat_audit_school_read on public.ic3_student_stat_audit;
create policy ic3_student_stat_audit_school_read
 on public.ic3_student_stat_audit for select to authenticated
 using (public.can_access_school(school_id));
revoke all on public.ic3_student_stat_audit from public,anon,authenticated;
grant select on public.ic3_student_stat_audit to authenticated;

-- Keep the public badges, class Top and school Top rankings synchronized through
-- the same security-invoker wallet view, including students with only corrections.
create or replace view public.ic3_star_wallets with (security_invoker=true) as
with rewards as (
 select r.school_id,r.student_id,r.record_date,r.created_at,r.points,r.star_event,r.title
 from public.student_records r where r.record_type='reward'
),
summary as (
 select school_id,student_id,
    coalesce(sum(greatest(points,0)),0)::integer earned,
    coalesce(sum(points),0)::integer available,
    count(*) filter(where star_event='penalty')::integer penalty_events,
    count(*) filter(where star_event='recovery')::integer used,
    max(record_date) filter(where points>0) last_award_date,
    max(created_at) filter(where points>0) last_award_at,
    max(record_date) filter(where star_event='recovery') last_restore_date,
    max(created_at) filter(where star_event='recovery') last_restore_at,
    max(created_at) filter(where star_event='penalty') last_penalty_at,
    max(created_at) filter(where star_event='penalty' and lower(trim(title)) like 'ngắt chuỗi%') last_break_at
 from rewards group by school_id,student_id
),
adjusted as (
 select coalesce(s.school_id,o.school_id) as school_id,
   coalesce(s.student_id,o.student_id) as student_id,
   (coalesce(s.earned,0)+coalesce(o.earned_delta,0))::integer as earned,
   (coalesce(s.available,0)+coalesce(o.available_delta,0))::integer as available,
   coalesce(s.penalty_events,0) as penalty_events,
   coalesce(s.used,0) as used,
   s.last_award_date,s.last_award_at,s.last_restore_date,s.last_restore_at,
   s.last_penalty_at,s.last_break_at
 from summary s
 full outer join public.ic3_student_stat_offsets o
   on o.school_id=s.school_id and o.student_id=s.student_id
),
activity as (
 select s.*,
    greatest(0,(now() at time zone 'Asia/Ho_Chi_Minh')::date -
      greatest(coalesce(last_award_date,date '1900-01-01'),
               coalesce(last_restore_date,date '1900-01-01')))::integer inactivity_days,
    coalesce(last_break_at > greatest(coalesce(last_award_at,'epoch'::timestamptz),
                                      coalesce(last_restore_at,'epoch'::timestamptz)),false) interrupted,
    coalesce(last_restore_at > last_penalty_at,false) recovered
 from adjusted s
),
scored as (
 select a.*,
  public.ic3_flame_effect_score(earned,penalty_events,inactivity_days)::integer raw_score
 from activity a
),
statuses as (
 select p.*,
  case
    when earned<20 then 'off'
    when interrupted then 'gray'
    when inactivity_days>=6 then 'off'
    when inactivity_days>=3 then 'gray'
    when raw_score<20 and not (recovered and inactivity_days<=2) then 'gray'
    when inactivity_days=2 then 'cooling'
    else 'active'
  end::text flame_state
 from scored p
)
select school_id,student_id,earned,available,
 case when recovered and inactivity_days<=2 then greatest(20,raw_score) else raw_score end::integer effect_score,
 greatest(0,3-used)::integer chances,
 (earned>=20 and used<3 and flame_state in ('gray','off'))::boolean can_restore,
 inactivity_days,flame_state,last_award_date
from statuses;

revoke all on public.ic3_star_wallets from public,anon;
grant select on public.ic3_star_wallets to authenticated;

create or replace view public.ic3_student_violation_totals with (security_invoker=true) as
select s.school_id,s.id as student_id,
 greatest(0,coalesce(base.total,0)::integer+coalesce(o.violation_delta,0))::integer as violations,
 coalesce(o.violation_delta,0)::integer as adjustment
from public.students s
left join (
 select r.school_id,r.student_id,count(*)::integer as total
 from public.student_records r
 where r.record_type='violation'
   and lower(trim(r.title)) not in ('mất trật tự','lỗi mất trật tự')
 group by r.school_id,r.student_id
) base on base.school_id=s.school_id and base.student_id=s.id
left join public.ic3_student_stat_offsets o
 on o.school_id=s.school_id and o.student_id=s.id;

revoke all on public.ic3_student_violation_totals from public,anon;
grant select on public.ic3_student_violation_totals to authenticated;

-- Transactional, authorization-checked edit of the THREE effective totals.
-- Expected values prevent a teacher from overwriting edits made in another tab.
create or replace function public.ic3_set_student_summary_totals(
 p_student_id uuid,
 p_available integer,
 p_earned integer,
 p_violations integer,
 p_expected_available integer,
 p_expected_earned integer,
 p_expected_violations integer,
 p_reason text
) returns boolean language plpgsql security definer
set search_path=public,pg_temp
as $set_totals$
declare
 v_actor uuid := auth.uid();
 v_school uuid;
 v_raw_available integer;
 v_raw_earned integer;
 v_raw_violations integer;
 v_old_available integer;
 v_old_earned integer;
 v_old_violations integer;
 v_offset public.ic3_student_stat_offsets%rowtype;
 v_confirmed integer;
 v_threshold integer;
 v_reason text := trim(coalesce(p_reason,''));
begin
 if v_actor is null then raise exception 'Bạn cần đăng nhập.'; end if;
 if not exists (
   select 1 from public.profiles p
   where p.id=v_actor and p.is_active=true and p.role in ('admin','teacher','staff')
 ) then raise exception 'Chỉ giáo viên và quản trị viên được sửa tổng sao/lỗi.'; end if;
 if p_student_id is null then raise exception 'Chưa chọn học sinh.'; end if;
 if p_available is null or p_earned is null or p_violations is null
   or p_expected_available is null or p_expected_earned is null
   or p_expected_violations is null then
   raise exception 'Thiếu giá trị cần chỉnh sửa.'; end if;
 if p_available<0 or p_earned<0 or p_violations<0 or p_available>p_earned
   or p_available>1000000 or p_earned>1000000 or p_violations>500 then
   raise exception 'Sao phải không âm, sao hiện có không vượt tổng sao; lỗi từ 0 đến 500.'; end if;
 if length(v_reason) not between 5 and 500 then
   raise exception 'Vui lòng nhập lý do chỉnh sửa từ 5 đến 500 ký tự.'; end if;

 select s.school_id into v_school
 from public.students s
 where s.id=p_student_id and s.status='active'
 for update;
 if v_school is null or not public.can_access_school(v_school) then
   raise exception 'Không có quyền tại trường của học sinh này.'; end if;

 select coalesce(sum(greatest(r.points,0)),0)::integer,
   coalesce(sum(r.points),0)::integer
 into v_raw_earned,v_raw_available
 from public.student_records r
 where r.school_id=v_school and r.student_id=p_student_id
   and r.record_type='reward';

 select count(*)::integer into v_raw_violations
 from public.student_records r
 where r.school_id=v_school and r.student_id=p_student_id
   and r.record_type='violation'
   and lower(trim(r.title)) not in ('mất trật tự','lỗi mất trật tự');

 select * into v_offset
 from public.ic3_student_stat_offsets o
 where o.school_id=v_school and o.student_id=p_student_id
 for update;

 v_old_earned:=v_raw_earned+coalesce(v_offset.earned_delta,0);
 v_old_available:=v_raw_available+coalesce(v_offset.available_delta,0);
 v_old_violations:=greatest(0,v_raw_violations+coalesce(v_offset.violation_delta,0));

 if p_expected_available<>v_old_available or p_expected_earned<>v_old_earned
    or p_expected_violations<>v_old_violations then
   raise exception 'Số liệu đã được giáo viên khác cập nhật. Hãy tải lại trước khi sửa.'; end if;

 if p_available=v_old_available and p_earned=v_old_earned
    and p_violations=v_old_violations then
   raise exception 'Chưa có giá trị nào thay đổi.'; end if;

 select coalesce(max(ir.violation_count),0) into v_confirmed
 from public.student_incident_reports ir
 where ir.school_id=v_school and ir.student_id=p_student_id and ir.status='confirmed';
 if p_violations<v_confirmed then
   raise exception 'Không thể giảm lỗi thấp hơn biên bản đã xác nhận (% lỗi).',v_confirmed; end if;

 insert into public.ic3_student_stat_offsets(
  school_id,student_id,earned_delta,available_delta,violation_delta,changed_by,changed_at)
 values(v_school,p_student_id,p_earned-v_raw_earned,p_available-v_raw_available,
  p_violations-v_raw_violations,v_actor,now())
 on conflict(school_id,student_id) do update
 set earned_delta=excluded.earned_delta,
   available_delta=excluded.available_delta,
   violation_delta=excluded.violation_delta,
   changed_by=excluded.changed_by,
   changed_at=excluded.changed_at;

 insert into public.ic3_student_stat_audit(
   school_id,student_id,before_totals,after_totals,reason,changed_by)
 values (v_school,p_student_id,
  jsonb_build_object('available',v_old_available,'earned',v_old_earned,'violations',v_old_violations),
  jsonb_build_object('available',p_available,'earned',p_earned,'violations',p_violations),
  v_reason,v_actor);

 -- Rebuild only UNCONFIRMED report drafts, never overwrite issued reports.
 if p_violations<>v_old_violations then
   delete from public.student_incident_reports
   where school_id=v_school and student_id=p_student_id and status='draft';

   select sc.violation_report_threshold into v_threshold
   from public.schools sc where sc.id=v_school;
   v_threshold:=greatest(coalesce(v_threshold,3),1);

   insert into public.student_incident_reports(school_id,student_id,milestone,violation_count)
   select v_school,p_student_id,g.milestone,g.milestone*v_threshold
   from generate_series(1,least(500,p_violations/v_threshold)) as g(milestone)
   on conflict(student_id,milestone) do nothing;
 end if;
 return true;
end;
$set_totals$;

revoke all on function public.ic3_set_student_summary_totals(uuid,integer,integer,integer,integer,integer,integer,text)
 from public,anon;
grant execute on function public.ic3_set_student_summary_totals(uuid,integer,integer,integer,integer,integer,integer,text)
 to authenticated;

-- Subsequent violations must continue from the ADJUSTED count.
create or replace function public.after_student_violation_insert()
returns trigger language plpgsql security definer set search_path=''
as $violation$
declare n integer; threshold integer; owner_school uuid;
begin
 if new.record_type is distinct from 'violation' then return new; end if;
 select school_id into owner_school from public.students where id=new.student_id;
 if owner_school is null or owner_school<>new.school_id then
   raise exception 'Học sinh không thuộc trường đang ghi nhận'; end if;
 select violation_report_threshold into threshold from public.schools where id=new.school_id;
 select greatest(0,count(*)::integer+coalesce((
    select o.violation_delta from public.ic3_student_stat_offsets o
    where o.school_id=new.school_id and o.student_id=new.student_id),0))
 into n from public.student_records r
 where r.student_id=new.student_id and r.school_id=new.school_id
   and r.record_type='violation' and lower(trim(r.title)) not in ('mất trật tự','lỗi mất trật tự');
 if n>=threshold and mod(n,threshold)=0 then
   insert into public.student_incident_reports(school_id,student_id,milestone,violation_count)
   values(new.school_id,new.student_id,n/threshold,n)
   on conflict(student_id,milestone) do nothing;
 end if;
 return new;
end;
$violation$;

-- Public computer violation badges follow the same adjusted student totals.
create or replace function public.get_class_violation_badges(p_code text)
 returns jsonb language plpgsql security definer set search_path=''
as $badges$
declare v_class public.classes%rowtype;
begin
 if p_code is null or length(trim(p_code)) not between 4 and 120 then return '[]'::jsonb; end if;
 select * into v_class from public.classes
 where (registration_code=upper(trim(p_code))
    or upper(trim(p_code))=any(legacy_registration_codes))
   and archived_at is null
 order by case when registration_code=upper(trim(p_code)) then 0 else 1 end limit 1;
 if not found then return '[]'::jsonb; end if;
 return (
 select coalesce(jsonb_agg(jsonb_build_object(
  'computer',c.computer_code,
  'violations',coalesce((
   select sum(v.violations) from public.ic3_student_violation_totals v
   join public.computer_assignments a on a.student_id=v.student_id
   join public.students st on st.id=v.student_id
   where a.computer_id=c.id and a.active and st.status='active'
     and st.school_id=v_class.school_id
     and (st.class_id=v_class.id or (st.class_id is null and st.class_name=v_class.class_name))
     and v.school_id=v_class.school_id),0),
  'biên_bản',exists(
   select 1 from public.student_incident_reports ir
   join public.computer_assignments a on a.student_id=ir.student_id
   join public.students st on st.id=a.student_id
   where a.computer_id=c.id and a.active and st.school_id=v_class.school_id
    and (st.class_id=v_class.id or (st.class_id is null and st.class_name=v_class.class_name))
    and ir.school_id=v_class.school_id and ir.status='confirmed'
  )) order by c.computer_code),'[]'::jsonb)
 from public.computers c where c.school_id=v_class.school_id
 );
end;
$badges$;

-- Reconcile drafts using adjusted counts when an individual record is corrected.
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
     select greatest(0,count(*)::integer+coalesce((
       select o.violation_delta from public.ic3_student_stat_offsets o
       where o.school_id=v_old.school_id and o.student_id=v_student),0))
     into v_count
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
