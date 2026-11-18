-- A logged-in teacher who belongs to a school may open its public
-- leaderboard even if another teacher created every existing class.
-- Never grant school-management rights or expose other-school class codes.
create or replace function public.ic3_my_school_board_code(p_school_id uuid)
returns text language plpgsql stable security definer
set search_path=public,pg_temp as $board$
declare v_uid uuid; v_code text;
begin
 v_uid:=auth.uid();
 if v_uid is null or p_school_id is null then return null; end if;
 if not exists(
   select 1 from public.profiles p
   where p.id=v_uid and p.is_active=true and p.role in ('admin','teacher','staff')
 ) then return null; end if;
 if not (
   exists(select 1 from public.school_members m where m.user_id=v_uid and m.school_id=p_school_id)
   or exists(select 1 from public.profiles p where p.id=v_uid and p.school_id=p_school_id)
   or exists(select 1 from public.classes c where c.school_id=p_school_id and c.created_by=v_uid)
 ) then return null; end if;
 select c.registration_code into v_code
 from public.classes c where c.school_id=p_school_id and c.archived_at is null
 order by c.created_at,c.id limit 1;
 return v_code;
end
$board$;

revoke all on function public.ic3_my_school_board_code(uuid) from public,anon;
grant execute on function public.ic3_my_school_board_code(uuid) to authenticated;
