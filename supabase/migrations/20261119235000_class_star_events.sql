-- Existing reward rows remain the ledger for earned and spendable stars.
alter table public.student_records add column star_event text
  check (star_event in ('penalty','recovery') and record_type='reward');

create view public.ic3_star_wallets with (security_invoker=true) as
with events as (
  select r.*, max(created_at) filter(where star_event='penalty')
    over(partition by school_id,student_id) as last_break
  from public.student_records r where record_type='reward'
), totals as (
  select school_id,student_id,coalesce(sum(greatest(points,0)),0)::int earned,
    sum(points)::int available,
    coalesce(sum(greatest(points,0)) filter(where created_at>last_break),0)::int since_break,
    count(*) filter(where star_event='recovery')::int used,
    last_break, max(created_at) filter(where star_event='recovery') last_restore
  from events group by school_id,student_id,last_break
)
select school_id, student_id, earned, available,
  case when last_break is null or last_restore>last_break then earned else since_break end as effect_score,
  greatest(0,3-used) as chances,
  coalesce(last_break is not null and (last_restore is null or last_restore<last_break)
    and earned-since_break>=20 and since_break<20 and used<3,false) as can_restore
from totals;
revoke all on public.ic3_star_wallets from public, anon;
grant select on public.ic3_star_wallets to authenticated;

-- Invoker permissions and the existing record INSERT policy govern every event.
create function public.ic3_validate_star_event() returns trigger
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
    if new.points > -2 or trunc(new.points)<>new.points then raise exception 'Phải trừ ít nhất 2 sao nguyên.'; end if;
  elsif new.star_event='recovery' then
    select * into wallet from public.ic3_star_wallets where student_id=new.student_id and school_id=new.school_id;
    if new.points<>0 or wallet.can_restore is not true then raise exception 'Chưa thể phục hồi hiệu ứng.'; end if;
  elsif new.points<0 then
    if -new.points>coalesce((select available from public.ic3_star_wallets where student_id=new.student_id and school_id=new.school_id),0)
      then raise exception 'Không đủ sao đổi quà.'; end if;
  end if;
  return new;
end;
$$;
create trigger validate_star_event before insert on public.student_records
for each row execute function public.ic3_validate_star_event();

create or replace function public.ic3_redeem_student_stars(
  p_student_id uuid, p_stars integer default 1, p_note text default 'Đổi quà'
) returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_school uuid;
  v_available numeric;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if p_stars is null or p_stars < 1 then raise exception 'Cần ít nhất 1 sao.'; end if;

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
    v_school,p_student_id,'reward','Đã đổi quà',-p_stars,
    left(coalesce(nullif(trim(p_note),''),'Giáo viên đã xác nhận đổi thưởng'),500),
    auth.uid(),current_date
  );
  return floor(v_available-p_stars)::integer;
end;
$$;

revoke all on function public.ic3_redeem_student_stars(uuid,integer,text) from public;
grant execute on function public.ic3_redeem_student_stars(uuid,integer,text) to authenticated;


drop function public.ic3_class_stars(text);
create function public.ic3_class_stars(p_code text)
returns table(student_id uuid,student_name text,earned integer,available integer,effect_score integer,computer text)
language sql stable security definer set search_path=public,pg_temp as $$
 select s.id,s.full_name,coalesce(w.earned,0),coalesce(w.available,0),coalesce(w.effect_score,0),pc.computer_code::text
 from public.classes c join public.students s on s.school_id=c.school_id and s.status='active'
 and (s.class_id=c.id or (s.class_id is null and s.class_name=c.class_name))
 left join public.ic3_star_wallets w on w.student_id=s.id and w.school_id=s.school_id
 left join lateral (select m.computer_code from public.computer_assignments a join public.computers m on m.id=a.computer_id
   where a.student_id=s.id and a.active and m.school_id=s.school_id order by a.id limit 1) pc on true
 where c.registration_code=p_code and c.archived_at is null;
$$;
revoke all on function public.ic3_class_stars(text) from public;
grant execute on function public.ic3_class_stars(text) to anon, authenticated;

-- Keep historical entries and issued reports, exclude historical disorder from future counts.
CREATE OR REPLACE FUNCTION public.after_student_violation_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE n integer; threshold integer; owner_school uuid;
BEGIN
 IF NEW.record_type IS DISTINCT FROM 'violation' THEN RETURN NEW; END IF;
 SELECT school_id INTO owner_school FROM public.students WHERE id=NEW.student_id;
 IF owner_school IS NULL OR owner_school<>NEW.school_id THEN
   RAISE EXCEPTION 'Học sinh không thuộc trường đang ghi nhận';
 END IF;
 SELECT violation_report_threshold INTO threshold FROM public.schools WHERE id=NEW.school_id;
 SELECT count(*) INTO n FROM public.student_records
  WHERE student_id=NEW.student_id AND school_id=NEW.school_id AND record_type='violation' AND lower(trim(title)) NOT IN ('mất trật tự','lỗi mất trật tự');
 IF n>=threshold AND mod(n,threshold)=0 THEN
   INSERT INTO public.student_incident_reports(school_id,student_id,milestone,violation_count)
   VALUES(NEW.school_id,NEW.student_id,n/threshold,n)
   ON CONFLICT(student_id,milestone) DO NOTHING;
 END IF;
 RETURN NEW;
END;
$fn$;
CREATE OR REPLACE FUNCTION public.get_class_violation_badges(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_class public.classes%ROWTYPE;
BEGIN
 IF p_code IS NULL OR length(trim(p_code)) NOT BETWEEN 4 AND 120
  THEN RETURN '[]'::jsonb; END IF;
 SELECT * INTO v_class FROM public.classes
 WHERE (registration_code=upper(trim(p_code)) OR upper(trim(p_code))=ANY(legacy_registration_codes)) AND archived_at IS NULL ORDER BY CASE WHEN registration_code=upper(trim(p_code)) THEN 0 ELSE 1 END LIMIT 1;
 IF NOT FOUND THEN RETURN '[]'::jsonb; END IF;
 RETURN (
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'computer',c.computer_code,
  'violations',COALESCE((
    SELECT count(*) FROM public.student_records r
    JOIN public.computer_assignments a ON a.student_id=r.student_id
    JOIN public.students st ON st.id=r.student_id
    WHERE a.computer_id=c.id AND a.active AND st.status='active'
      AND st.school_id=v_class.school_id
      AND (st.class_id=v_class.id OR (st.class_id IS NULL AND st.class_name=v_class.class_name))
      AND r.school_id=v_class.school_id AND r.record_type='violation' AND lower(trim(r.title)) NOT IN ('mất trật tự','lỗi mất trật tự')),0),
  'biên_bản',EXISTS(
    SELECT 1 FROM public.student_incident_reports ir
    JOIN public.computer_assignments a ON a.student_id=ir.student_id
    JOIN public.students st ON st.id=a.student_id
    WHERE a.computer_id=c.id AND a.active AND st.school_id=v_class.school_id
      AND (st.class_id=v_class.id OR (st.class_id IS NULL AND st.class_name=v_class.class_name))
      AND ir.school_id=v_class.school_id AND ir.status='confirmed')
 ) ORDER BY c.computer_code),'[]'::jsonb)
 FROM public.computers c WHERE c.school_id=v_class.school_id
 );
END;
$function$
;

