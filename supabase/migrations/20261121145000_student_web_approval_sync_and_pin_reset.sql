-- Preserve student credentials when an older teacher approval RPC approves the
-- registration without using qlpm_teacher_student_web_approve.
-- Only link when there is exactly one eligible pupil in the exact class/school.
create or replace function public.qlpm_student_web_sync_approval()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  v public.qlpm_student_web_credentials%rowtype;
  target_id uuid;
  candidates bigint;
begin
  if new.status <> 'approved' or old.status = 'approved' then return new; end if;
  select * into v from public.qlpm_student_web_credentials
   where registration_id = new.id and student_id is null
   for update;
  if v.registration_id is null then return new; end if;
  select count(*),min(s.id) into candidates,target_id
   from public.students s
   join public.classes c on c.id=v.class_id and c.school_id=v.school_id
   where s.school_id=v.school_id and s.status='active'
   and (s.class_id=v.class_id or (s.class_id is null and s.class_name=c.class_name))
   and lower(btrim(s.full_name))=lower(btrim(new.full_name));
  if candidates = 1 and not exists(
     select 1 from public.qlpm_student_web_credentials other
     where other.student_id=target_id and other.registration_id<>new.id
  ) then
    update public.qlpm_student_web_credentials
     set student_id=target_id,approved_at=now()
     where registration_id=new.id and student_id is null;
  end if;
  return new;
end $$;
revoke all on function public.qlpm_student_web_sync_approval() from public,anon,authenticated;
drop trigger if exists trg_qlpm_student_web_sync_approval on public.student_registrations;
create trigger trg_qlpm_student_web_sync_approval
after update of status on public.student_registrations
for each row execute function public.qlpm_student_web_sync_approval();

-- Password recovery is an explicitly authorized teacher action.
-- No raw PIN is ever returned by the account list, login or reset RPC.
create or replace function public.qlpm_teacher_student_web_reset_pin(
 p_student_id uuid, p_new_pin text
) returns boolean language plpgsql volatile security definer set search_path='' as $$
declare
 v public.qlpm_student_web_credentials%rowtype;
 class_owner uuid;
 registration_status text;
begin
 if auth.uid() is null then raise exception 'Bạn cần đăng nhập giáo viên.'; end if;
 if coalesce(p_new_pin,'') !~ '^[0-9]{6}$' or p_new_pin ~ '^([0-9])\1{5}$' then
   raise exception 'Mã PIN cần 6 chữ số, không lặp lại cùng một số.';
 end if;
 select cred.* into v
   from public.qlpm_student_web_credentials cred
   join public.classes c on c.id=cred.class_id
   join public.student_registrations r on r.id=cred.registration_id
   join public.students st on st.id=cred.student_id
   where cred.student_id=p_student_id and st.status='active'
   for update of cred;
 if v.registration_id is null then
   raise exception 'Học sinh chưa có tài khoản Student Web hợp lệ.';
 end if;
 select c.created_by,r.status into class_owner,registration_status
 from public.classes c join public.student_registrations r on r.id=v.registration_id
 where c.id=v.class_id;
 if registration_status <> 'approved' or
   not public.can_access_school(v.school_id) or
   (class_owner is distinct from auth.uid() and not public.is_admin()) then
   raise exception 'Chỉ giáo viên chủ lớp hoặc quản trị viên mới được đặt lại PIN.';
 end if;
 update public.qlpm_student_web_credentials
   set pin_hash=extensions.crypt(p_new_pin,extensions.gen_salt('bf',10)),
       failed_attempts=0,locked_until=null
   where registration_id=v.registration_id;
 update public.qlpm_student_desktop_sessions
   set revoked_at=now()
   where student_id=p_student_id and revoked_at is null;
 return true;
end $$;
revoke all on function public.qlpm_teacher_student_web_reset_pin(uuid,text) from public,anon;
grant execute on function public.qlpm_teacher_student_web_reset_pin(uuid,text) to authenticated;
