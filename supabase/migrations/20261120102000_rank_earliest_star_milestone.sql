-- Equal earned-star totals are ranked by the FIRST timestamp each student reached
-- that current earned milestone, not by spendable stars or alphabetical name.
-- Includes corrections from the audited summary adjuster.
create or replace function public.ic3_earned_threshold_at(p_student_id uuid,p_earned integer)
returns timestamptz language sql stable security definer
set search_path=public,pg_temp as $threshold$
 select min(event_at) from (
   select event_at,
     sum(delta) over(order by event_at,event_source,event_id rows unbounded preceding) as cumulative
   from (
     select r.created_at as event_at,0 as event_source,r.id::text as event_id,
       greatest(r.points,0) as delta
     from public.student_records r
     where r.student_id=p_student_id and r.record_type='reward' and r.points>0
     union all
     select a.changed_at,1,a.id::text,
       ((a.after_totals->>'earned')::numeric-(a.before_totals->>'earned')::numeric)
     from public.ic3_student_stat_audit a where a.student_id=p_student_id
   ) events
 ) running
 where cumulative>=p_earned and p_earned>0;
$threshold$;
revoke all on function public.ic3_earned_threshold_at(uuid,integer) from public,anon,authenticated;

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
     substring(trim(c.class_name) from '^[678]') as grade
   from public.classes c where c.school_id=v_school_id and c.archived_at is null
 ),
 enrolled as (
   -- Include every active student at this school even if their class has not
   -- received an official registration code yet. Those students may rank,
   -- while the public class directory still lists ONLY active classes/codes.
   select s.id as student_id,s.full_name as student_name,
      match.id as class_id,coalesce(match.class_name,s.class_name,'Chưa phân lớp') as class_name,
      substring(trim(coalesce(match.class_name,s.class_name,'')) from '^[678]') as grade
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

-- Class Top 5 uses the same tie-breaker as school / grade Top 10.
create or replace function public.ic3_class_stars(p_code text)
returns table(student_id uuid,student_name text,earned integer,available integer,effect_score integer,computer text)
language sql stable security definer set search_path=public,pg_temp
as $class_stars$
 select s.id,s.full_name,coalesce(w.earned,0),coalesce(w.available,0),
   coalesce(w.effect_score,0),pc.computer_code::text
 from public.classes c
 join public.students s on s.school_id=c.school_id and s.status='active'
   and (s.class_id=c.id or (s.class_id is null and s.class_name=c.class_name))
 left join public.ic3_star_wallets w on w.student_id=s.id and w.school_id=s.school_id
 left join lateral (
  select m.computer_code from public.computer_assignments a
  join public.computers m on m.id=a.computer_id
  where a.student_id=s.id and a.active and m.school_id=s.school_id
  order by a.id limit 1
 ) pc on true
 where c.registration_code=p_code and c.archived_at is null
 order by coalesce(w.earned,0) desc,
   public.ic3_earned_threshold_at(s.id,coalesce(w.earned,0)) asc nulls last,
   coalesce(w.available,0) desc,s.full_name,s.id;
$class_stars$;
revoke all on function public.ic3_class_stars(text) from public;
grant execute on function public.ic3_class_stars(text) to anon,authenticated;
