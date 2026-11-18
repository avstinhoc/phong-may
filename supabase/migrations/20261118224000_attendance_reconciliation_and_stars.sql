-- Keep the last verified attendance state per mapped Web student and lesson.
-- This provides a change baseline; unknown conflicting cells are never silently overwritten.
alter table public.school_sheet_tabs
  add column if not exists attendance_snapshot jsonb not null default '{}'::jsonb;

-- Atomic reward redemption: keep earned-star history while subtracting spendable stars.
-- Only an authenticated educator associated with the student's school may redeem.
create or replace function public.ic3_redeem_student_stars(
  p_student_id uuid, p_stars integer default 1, p_note text default 'Đổi kẹo'
) returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_school uuid;
  v_available numeric;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if p_stars < 1 or p_stars > 100 then raise exception 'Số sao phải từ 1 đến 100.'; end if;

  select s.school_id into v_school
  from public.students s where s.id=p_student_id and s.status='active'
  for update;
  if v_school is null then raise exception 'Không tìm thấy học sinh đang học.'; end if;

  if not exists (
    select 1 from public.profiles p
    where p.id=auth.uid() and p.is_active=true and p.role in ('admin','teacher','staff')
  ) or not (
    exists(select 1 from public.school_members m where m.user_id=auth.uid() and m.school_id=v_school)
    or exists(select 1 from public.profiles p where p.id=auth.uid() and p.school_id=v_school)
  ) then raise exception 'Bạn không có quyền đổi thưởng tại trường này.'; end if;

  select coalesce(sum(r.points),0) into v_available
  from public.student_records r
  where r.school_id=v_school and r.student_id=p_student_id and r.record_type='reward';

  if v_available < p_stars then raise exception 'Số sao khả dụng không đủ để đổi.'; end if;
  insert into public.student_records(
    school_id,student_id,record_type,title,points,note,created_by,record_date
  ) values (
    v_school,p_student_id,'reward','Đã đổi kẹo',-p_stars,
    left(coalesce(nullif(trim(p_note),''),'Giáo viên đã xác nhận đổi thưởng'),500),
    auth.uid(),current_date
  );
  return floor(v_available-p_stars)::integer;
end;
$$;

revoke all on function public.ic3_redeem_student_stars(uuid,integer,text) from public;
grant execute on function public.ic3_redeem_student_stars(uuid,integer,text) to authenticated;

-- Limited class-code star leaderboard; no token, grade or personal data exposed.
create or replace function public.ic3_class_stars(p_code text)
returns table(student_id uuid, student_name text, earned integer, available integer)
language sql stable security definer set search_path = public, pg_temp
as $$
  select s.id, s.full_name,
    coalesce(sum(case when r.record_type='reward' and r.points>0 then r.points else 0 end),0)::integer,
    greatest(0,coalesce(sum(case when r.record_type='reward' then r.points else 0 end),0))::integer
  from public.classes c
  join public.students s on s.school_id=c.school_id and s.class_name=c.class_name
    and s.status='active'
  left join public.student_records r on r.student_id=s.id and r.school_id=c.school_id
  where c.registration_code=p_code and c.archived_at is null
  group by s.id,s.full_name
  order by 3 desc, 4 desc, s.full_name
  limit 100;
$$;
revoke all on function public.ic3_class_stars(text) from public;
grant execute on function public.ic3_class_stars(text) to anon, authenticated;
