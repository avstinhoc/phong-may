-- QLPM one-level flame penalties; existing awards and gift redemptions stay intact.
-- Legacy "Ngắt chuỗi" records continue to display as history, and their previous
-- recovery/gray-state rules remain. New "Mất trật tự" penalties reduce one tier.

-- Each teacher penalty costs exactly ONE flame tier, independent of how many
-- stars were deducted. From the second consecutive inactive day onward, each
-- calendar day costs one more tier. Redemption never lowers the flame level.
create or replace function public.ic3_flame_effect_score(
 p_earned integer,p_penalties integer,p_inactivity_days integer
) returns integer
language sql immutable set search_path=public,pg_temp as $flame$
 with tiers as (
  select threshold::integer,ordinality::integer as lvl
  from unnest(array[20,24,28,32,36,40,44,48,52,56,60,64,68,72,76,80,84,88,92,96,100,110,120,135,150,175,200]::integer[]) with ordinality as t(threshold,ordinality)
 ), base as (
  select coalesce(max(lvl),0)::integer as lvl from tiers where threshold<=coalesce(p_earned,0)
 )
 select coalesce((
  select t.threshold from tiers t,base b
  where t.lvl=b.lvl-greatest(0,coalesce(p_penalties,0))
                     -greatest(0,coalesce(p_inactivity_days,0)-1)
 ),0)::integer
$flame$;


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


