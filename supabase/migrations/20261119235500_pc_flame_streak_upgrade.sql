-- QLPM: graded PC fire/frame effects, three recovery chances and minimum 2-star redemption.
-- No reward history or Google Sheets data is modified by this migration.
-- A streak cools after 2 calendar days without earning a star (VN time);
-- the frame disappears after 3 days; a gray recovery window remains.
-- The existing explicit "Ngắt chuỗi" action still deducts 2 real stars.
create or replace view public.ic3_star_wallets with (security_invoker=true) as
with rewards as (
 select r.school_id,r.student_id,r.record_date,r.created_at,r.points,r.star_event,r.title
 from public.student_records r where r.record_type='reward'
),
summary as (
 select school_id,student_id,
    coalesce(sum(greatest(points,0)),0)::integer earned,
    coalesce(sum(points),0)::integer available,
    coalesce(sum(case when star_event='penalty'
      and lower(trim(title)) not like 'ngắt chuỗi%' then abs(points) else 0 end),0)::integer discipline_loss,
    count(*) filter(where star_event='recovery')::integer used,
    max(record_date) filter(where points>0) last_award_date,
    max(created_at) filter(where points>0) last_award_at,
    max(record_date) filter(where star_event='recovery') last_restore_date,
    max(created_at) filter(where star_event='recovery') last_restore_at,
    max(created_at) filter(where star_event='penalty') last_penalty_at,
    max(created_at) filter(where star_event='penalty' and lower(trim(title)) like 'ngắt chuỗi%') last_break_at
 from rewards group by school_id,student_id
),
activity as (
 select s.*,
    greatest(0,(now() at time zone 'Asia/Ho_Chi_Minh')::date -
      greatest(coalesce(last_award_date,date '1900-01-01'),
               coalesce(last_restore_date,date '1900-01-01')))::integer inactivity_days,
    coalesce(last_break_at > greatest(coalesce(last_award_at,'epoch'::timestamptz),
                                      coalesce(last_restore_at,'epoch'::timestamptz)),false) interrupted,
    coalesce(last_restore_at > last_penalty_at,false) recovered
 from summary s
),
scored as (
 select a.*,
  greatest(0,earned-3*discipline_loss-7*greatest(0,inactivity_days-1))::integer raw_score
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

-- Enforce server-side rules even if a client attempts to bypass the UI.
-- Existing record ledger, school-based student locking and 3-chance validation remain.
create or replace function public.ic3_validate_star_event() returns trigger
language plpgsql set search_path=public,pg_temp as $$
declare wallet record;
begin
 if new.record_type='violation' and lower(trim(new.title)) in ('mất trật tự','lỗi mất trật tự') then
   new.record_type:='reward';
   new.star_event:='penalty';
   if new.points=0 then new.points:=-2; end if;
 end if;
 if new.record_type <> 'reward' then return new; end if;
 perform 1 from public.students where id=new.student_id and school_id=new.school_id for update;
 if not found then raise exception 'Học sinh không thuộc trường đang chọn.'; end if;
 new.created_at:=clock_timestamp();
 if new.star_event='penalty' then
   if new.points>-2 or trunc(new.points)<>new.points then raise exception 'Phải trừ ít nhất 2 sao nguyên.'; end if;
 elsif new.star_event='recovery' then
   select * into wallet from public.ic3_star_wallets where student_id=new.student_id and school_id=new.school_id;
   if new.points<>0 or wallet.can_restore is not true then raise exception 'Chưa thể phục hồi hiệu ứng hoặc đã hết 3 lượt.'; end if;
 elsif new.points<0 then
   if -new.points<2 or trunc(new.points)<>new.points then raise exception 'Đổi quà tối thiểu 2 sao nguyên.'; end if;
   if -new.points>coalesce((select available from public.ic3_star_wallets
      where student_id=new.student_id and school_id=new.school_id),0)
   then raise exception 'Không đủ sao để đổi quà.'; end if;
 end if;
 return new;
end;
$$;

-- The existing redemption function is kept at the same signature and grants.
create or replace function public.ic3_redeem_student_stars(
 p_student_id uuid,p_stars integer default 2,p_note text default 'Đổi quà'
) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_school uuid;v_available numeric;
begin
 if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
 if p_stars is null or p_stars<2 then raise exception 'Cần ít nhất 2 sao để đổi quà.'; end if;
 select s.school_id into v_school from public.students s
 where s.id=p_student_id and s.status='active' for update;
 if v_school is null then raise exception 'Không tìm thấy học sinh đang học.'; end if;
 if not exists(select 1 from public.profiles p where p.id=auth.uid()
   and p.is_active=true and p.role in ('admin','teacher','staff'))
 or not (exists(select 1 from public.school_members m where m.user_id=auth.uid() and m.school_id=v_school)
   or exists(select 1 from public.profiles p where p.id=auth.uid() and p.school_id=v_school))
 then raise exception 'Bạn không có quyền đổi thưởng tại trường này.'; end if;
 select coalesce(sum(r.points),0) into v_available
 from public.student_records r
 where r.school_id=v_school and r.student_id=p_student_id and r.record_type='reward';
 if v_available<p_stars then raise exception 'Số sao khả dụng không đủ để đổi.'; end if;
 insert into public.student_records(school_id,student_id,record_type,title,points,note,created_by,record_date)
 values(v_school,p_student_id,'reward','Đã đổi quà',-p_stars,
  left(coalesce(nullif(trim(p_note),''),'Giáo viên đã xác nhận đổi quà'),500),
  auth.uid(),(now() at time zone 'Asia/Ho_Chi_Minh')::date);
 return floor(v_available-p_stars)::integer;
end;
$$;
revoke all on function public.ic3_redeem_student_stars(uuid,integer,text) from public;
grant execute on function public.ic3_redeem_student_stars(uuid,integer,text) to authenticated;

-- Public student portal receives only non-sensitive visual state for its class.
create or replace function public.ic3_class_flame_status(p_code text)
returns table(student_id uuid,effect_score integer,flame_state text,inactivity_days integer,
 chances integer,can_restore boolean)
language sql stable security definer set search_path=public,pg_temp as $$
 select s.id,coalesce(w.effect_score,0),coalesce(w.flame_state,'off'),
   coalesce(w.inactivity_days,0),coalesce(w.chances,3),coalesce(w.can_restore,false)
 from public.classes c join public.students s on s.school_id=c.school_id and s.status='active'
   and (s.class_id=c.id or (s.class_id is null and s.class_name=c.class_name))
 left join public.ic3_star_wallets w on w.student_id=s.id and w.school_id=s.school_id
 where c.registration_code=p_code and c.archived_at is null;
$$;
revoke all on function public.ic3_class_flame_status(text) from public;
grant execute on function public.ic3_class_flame_status(text) to anon,authenticated;
