-- Lesson-based flame streak. A teaching session counts only at/after 18:00 VN,
-- so students are not penalized on weekends, holidays or other non-teaching days.
create or replace function public.ic3_lesson_deadline_passed(
 p_session_date date,p_now timestamptz
) returns boolean language sql immutable as $deadline$
 select p_session_date<(p_now at time zone 'Asia/Ho_Chi_Minh')::date
  or (p_session_date=(p_now at time zone 'Asia/Ho_Chi_Minh')::date
      and (p_now at time zone 'Asia/Ho_Chi_Minh')::time>=time '18:00');
$deadline$;

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
-- A missed teaching day only counts after 18:00 in Asia/Ho_Chi_Minh.
-- No scheduled lesson => no flame expiry; multiple lessons on one day count once.
missed_sessions as (
 select s.school_id,s.id as student_id,
    count(distinct cs.session_date)::integer as missed_days
 from public.students s
 join public.class_sessions cs
  on cs.school_id=s.school_id
  and (cs.class_id=s.class_id or cs.class_name=s.class_name)
 join adjusted a on a.school_id=s.school_id and a.student_id=s.id
 where s.status='active'
  and cs.session_date>greatest(coalesce(a.last_award_date,date '1900-01-01'),
                               coalesce(a.last_restore_date,date '1900-01-01'))
  and cs.session_date>=(s.created_at at time zone 'Asia/Ho_Chi_Minh')::date
  and public.ic3_lesson_deadline_passed(cs.session_date,now())
 group by s.school_id,s.id
),
activity as (
 select s.*,
    coalesce(m.missed_days,0)::integer as inactivity_days,
    coalesce(last_break_at > greatest(coalesce(last_award_at,'epoch'::timestamptz),
                                      coalesce(last_restore_at,'epoch'::timestamptz)),false) interrupted,
    coalesce(last_restore_at > last_penalty_at,false) recovered
 from adjusted s
 left join missed_sessions m on m.school_id=s.school_id and m.student_id=s.student_id
),
scored as (
 select a.*,
  public.ic3_flame_effect_score(earned,penalty_events,inactivity_days+1)::integer raw_score
 from activity a
),
statuses as (
 select p.*,
  case
    when earned<20 then 'off'
    when interrupted then 'gray'
    when inactivity_days>=3 then 'off'
    when inactivity_days>=1 then 'gray'
    when raw_score<20 and not (recovered and inactivity_days=0) then 'gray'
    else 'active'
  end::text flame_state
 from scored p
)
select school_id,student_id,earned,available,
 case when recovered and inactivity_days=0 then greatest(20,raw_score) else raw_score end::integer effect_score,
 greatest(0,3-used)::integer chances,
 (earned>=20 and used<3 and flame_state in ('gray','off'))::boolean can_restore,
 inactivity_days,flame_state,last_award_date
from statuses;
-- Keep the view readable only through existing staff-scoped RLS.
revoke all on public.ic3_star_wallets from public,anon;
grant select on public.ic3_star_wallets to authenticated;
