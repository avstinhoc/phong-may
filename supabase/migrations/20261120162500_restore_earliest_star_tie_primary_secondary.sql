-- Fix regression: equal earned totals must rank by first time reaching the current
-- star milestone. Preserve dynamic grade boards 1–9 and Top 5 school isolation.
-- Uses the existing ic3_earned_threshold_at() helper; no student data is changed.
-- Upgrade school leaderboard to include active students even when an official
-- class registration code is not yet created. Keep school-ID isolation and avoid
-- publishing unregistered/archived class codes.
create or replace function public.ic3_school_public_portal(p_class_code text)
returns jsonb language plpgsql stable security definer
set search_path=public,pg_temp as $school$
declare v_school_id uuid;v_school_name text;v_result jsonb;
begin
 if p_class_code is null or length(trim(p_class_code)) not between 4 and 120 then return null; end if;
 select c.school_id into v_school_id
 from public.classes c
 where c.archived_at is null
   and (c.registration_code=upper(trim(p_class_code))
        or upper(trim(p_class_code))=any(c.legacy_registration_codes))
 order by case when c.registration_code=upper(trim(p_class_code)) then 0 else 1 end
 limit 1;
 if v_school_id is null then return null; end if;
 select sc.name into v_school_name from public.schools sc where sc.id=v_school_id;
 if v_school_name is null then return null; end if;

 with open_classes as (
   select c.id,c.class_name,c.registration_code,
     substring(trim(c.class_name) from '^([1-9])(?=[^0-9]|$)') as grade
   from public.classes c where c.school_id=v_school_id and c.archived_at is null
 ),
 enrolled as (
   -- Include every active student at this school even if their class has not
   -- received an official registration code yet. Those students may rank,
   -- while the public class directory still lists ONLY active classes/codes.
   select s.id as student_id,s.full_name as student_name,
      match.id as class_id,coalesce(match.class_name,s.class_name,'Chưa phân lớp') as class_name,
      substring(trim(coalesce(match.class_name,s.class_name,'')) from '^([1-9])(?=[^0-9]|$)') as grade
   from public.students s
   left join lateral (
     select c.id,c.class_name from open_classes c
     where c.id=s.class_id or (s.class_id is null and s.class_name=c.class_name)
     order by case when c.id=s.class_id then 0 else 1 end,c.id
     limit 1
   ) match on true
   where s.school_id=v_school_id and s.status='active'
 ),
 scores as (
   select e.student_id,e.student_name,e.class_id,e.class_name,e.grade,
      coalesce(w.earned,0)::integer as earned,
      coalesce(w.available,0)::integer as available,
      coalesce(w.effect_score,0)::integer as effect_score,
      coalesce(w.flame_state,'off')::text as flame_state,
      public.ic3_earned_threshold_at(e.student_id,coalesce(w.earned,0)) as reached_at
   from enrolled e
   left join public.ic3_star_wallets w on w.student_id=e.student_id and w.school_id=v_school_id
 ),
 ranked as (
   select s.*,
      row_number() over(order by earned desc,reached_at asc nulls last,available desc,student_name collate "default",class_name,student_id) as all_rank,
      row_number() over(partition by grade order by earned desc,reached_at asc nulls last,available desc,student_name collate "default",class_name,student_id) as grade_rank
   from scores s where earned>0
 ),
 class_rows as (
   select c.class_name,c.registration_code,c.grade,
     count(e.student_id)::integer as student_count
   from open_classes c left join enrolled e on e.class_id=c.id
   group by c.id,c.class_name,c.registration_code,c.grade
 )
 select jsonb_build_object(
   'school_name',v_school_name,
   'student_count',(select count(*) from enrolled),
   'class_count',(select count(*) from open_classes),
   'top_school',coalesce((
      select jsonb_agg(jsonb_build_object(
         'rank',r.all_rank,'name',r.student_name,'class_name',r.class_name,
         'earned',r.earned,'available',r.available,'effect_score',r.effect_score,
         'flame_state',r.flame_state) order by r.all_rank)
      from ranked r where r.all_rank<=5
   ),'[]'::jsonb),
   'grades',coalesce((
     select jsonb_agg(g.grade order by g.grade::integer)
     from (
       select distinct grade from open_classes where grade is not null
       union select distinct grade from enrolled where grade is not null
     ) g
   ),'[]'::jsonb),
   'grade_boards',coalesce((
     select jsonb_object_agg(g.grade,coalesce((
       select jsonb_agg(jsonb_build_object(
         'rank',r.grade_rank,'name',r.student_name,'class_name',r.class_name,
         'earned',r.earned,'available',r.available,'effect_score',r.effect_score,
         'flame_state',r.flame_state
       ) order by r.grade_rank)
       from ranked r where r.grade=g.grade and r.grade_rank<=10
     ),'[]'::jsonb))
     from (
       select distinct grade from open_classes where grade is not null
       union select distinct grade from enrolled where grade is not null
     ) g
   ),'{}'::jsonb),
   'top_6',coalesce((
      select jsonb_agg(jsonb_build_object(
         'rank',r.grade_rank,'name',r.student_name,'class_name',r.class_name,
         'earned',r.earned,'available',r.available,'effect_score',r.effect_score,
         'flame_state',r.flame_state) order by r.grade_rank)
      from ranked r where r.grade='6' and r.grade_rank<=10
   ),'[]'::jsonb),
   'top_7',coalesce((
      select jsonb_agg(jsonb_build_object(
         'rank',r.grade_rank,'name',r.student_name,'class_name',r.class_name,
         'earned',r.earned,'available',r.available,'effect_score',r.effect_score,
         'flame_state',r.flame_state) order by r.grade_rank)
      from ranked r where r.grade='7' and r.grade_rank<=10
   ),'[]'::jsonb),
   'top_8',coalesce((
      select jsonb_agg(jsonb_build_object(
         'rank',r.grade_rank,'name',r.student_name,'class_name',r.class_name,
         'earned',r.earned,'available',r.available,'effect_score',r.effect_score,
         'flame_state',r.flame_state) order by r.grade_rank)
      from ranked r where r.grade='8' and r.grade_rank<=10
   ),'[]'::jsonb),
   'classes',coalesce((
     select jsonb_agg(jsonb_build_object(
       'class_name',c.class_name,'registration_code',c.registration_code,
       'grade',c.grade,'student_count',c.student_count)
       order by c.grade desc nulls last,c.class_name)
     from class_rows c
   ),'[]'::jsonb)
 ) into v_result;
 return v_result;
end
$school$;


revoke all on function public.ic3_school_public_portal(text) from public;
grant execute on function public.ic3_school_public_portal(text) to anon,authenticated;
