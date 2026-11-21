-- QLPM Student Desktop foundation. REVIEW ONLY: not applied to production by this PR.
-- Reuses existing students/classes/computers; private PIN hashes and sessions are NOT public tables.
-- Existing website registrations and rewards are untouched.
create table if not exists public.qlpm_student_desktop_pins (
 student_id uuid primary key references public.students(id) on delete cascade,
 pin_hash text not null,
 issued_by uuid references public.profiles(id),
 issued_at timestamptz not null default now(),
 failed_attempts integer not null default 0 check(failed_attempts between 0 and 100),
 locked_until timestamptz
);
create table if not exists public.qlpm_student_desktop_sessions (
 token_hash text primary key,
 student_id uuid not null references public.students(id) on delete cascade,
 device_id text not null default '',
 issued_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 expires_at timestamptz not null default (now() + interval '90 minutes'),
 revoked_at timestamptz
);
create index if not exists qlpm_student_desktop_sessions_student_idx on public.qlpm_student_desktop_sessions(student_id,expires_at);
create table if not exists public.qlpm_student_desktop_pin_requests (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete cascade,
 school_id uuid not null references public.schools(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references public.profiles(id)
);
create index if not exists qlpm_student_desktop_pin_pending_idx on public.qlpm_student_desktop_pin_requests(school_id,status,created_at);
create table if not exists public.qlpm_student_desktop_pc_requests (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete cascade,
 school_id uuid not null references public.schools(id) on delete cascade,
 computer_id uuid not null references public.computers(id) on delete cascade,
 device_id text not null default '',
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references public.profiles(id)
);
create index if not exists qlpm_student_desktop_pc_pending_idx on public.qlpm_student_desktop_pc_requests(school_id,status,created_at);

alter table public.qlpm_student_desktop_pins enable row level security;
alter table public.qlpm_student_desktop_sessions enable row level security;
alter table public.qlpm_student_desktop_pin_requests enable row level security;
alter table public.qlpm_student_desktop_pc_requests enable row level security;
revoke all on public.qlpm_student_desktop_pins from public,anon,authenticated;
revoke all on public.qlpm_student_desktop_sessions from public,anon,authenticated;
revoke all on public.qlpm_student_desktop_pin_requests from public,anon,authenticated;
revoke all on public.qlpm_student_desktop_pc_requests from public,anon,authenticated;

-- A class registration code is already used by the public school portal.
-- Do NOT return phones, marks, private identifiers except student UUID needed to select own name.
create or replace function public.qlpm_student_desktop_roster(p_code text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare cl public.classes%rowtype;
begin
 if length(trim(coalesce(p_code,''))) not between 4 and 120 then return null; end if;
 select * into cl from public.classes c
 where c.archived_at is null and (c.registration_code=upper(trim(p_code))
 or upper(trim(p_code))=any(c.legacy_registration_codes))
 limit 1;
 if cl.id is null then return null; end if;
 return jsonb_build_object(
  'school_id',cl.school_id,'school_name',(select name from public.schools where id=cl.school_id),
  'class_id',cl.id,'class_name',cl.class_name,'registration_code',cl.registration_code,
  'students',coalesce((
    select jsonb_agg(jsonb_build_object('id',s.id,'name',s.full_name) order by s.full_name)
    from public.students s where s.school_id=cl.school_id and s.status='active'
    and (s.class_id=cl.id or (s.class_id is null and s.class_name=cl.class_name))
   ),'[]'::jsonb)
 );
end $$;
revoke all on function public.qlpm_student_desktop_roster(text) from public;
grant execute on function public.qlpm_student_desktop_roster(text) to anon,authenticated;

-- All teacher operations enforce existing per-school membership and active-staff checks.
create or replace function public.qlpm_teacher_issue_student_pin(p_student_id uuid)
returns text language plpgsql volatile security definer set search_path='' as $$
declare st public.students%rowtype; b bytea; n bigint; new_pin text;
begin
 select * into st from public.students where id=p_student_id and status='active' for update;
 if st.id is null or not public.can_access_school(st.school_id) then
  raise exception 'Không có quyền cấp mã PIN cho học sinh này';
 end if;
 b:=extensions.gen_random_bytes(4);
 n:=((get_byte(b,0)::bigint<<24)+(get_byte(b,1)::bigint<<16)
    +(get_byte(b,2)::bigint<<8)+get_byte(b,3)::bigint);
 new_pin:=lpad((n%1000000)::text,6,'0');
 insert into public.qlpm_student_desktop_pins(student_id,pin_hash,issued_by,issued_at,failed_attempts,locked_until)
 values (st.id,extensions.crypt(new_pin,extensions.gen_salt('bf',12)),auth.uid(),now(),0,null)
 on conflict(student_id) do update set pin_hash=excluded.pin_hash,issued_by=excluded.issued_by,
 issued_at=now(),failed_attempts=0,locked_until=null;
 update public.qlpm_student_desktop_sessions set revoked_at=now()
 where student_id=st.id and revoked_at is null;
 return new_pin; -- teacher sees once; plaintext is never stored
end $$;
revoke all on function public.qlpm_teacher_issue_student_pin(uuid) from public;
grant execute on function public.qlpm_teacher_issue_student_pin(uuid) to authenticated;

-- Failed logins are rate-limited per student and PINs are salted Bcrypt hashes.
create or replace function public.qlpm_student_desktop_login(
 p_code text,p_student_id uuid,p_pin text,p_device_id text default ''
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare cl public.classes%rowtype; st public.students%rowtype;
 pin public.qlpm_student_desktop_pins%rowtype;
 session_token text; v_attempts int;
begin
 if length(trim(coalesce(p_code,''))) not between 4 and 120 or coalesce(p_pin,'') !~ '^[0-9]{6}$'
 or p_student_id is null then return jsonb_build_object('ok',false,'message','Mã PIN hoặc tài khoản chưa đúng.'); end if;
 select * into cl from public.classes where archived_at is null and
  (registration_code=upper(trim(p_code)) or upper(trim(p_code))=any(legacy_registration_codes)) limit 1;
 select * into st from public.students where id=p_student_id and school_id=cl.school_id and status='active'
  and (class_id=cl.id or (class_id is null and class_name=cl.class_name));
 if cl.id is null or st.id is null then return jsonb_build_object('ok',false,'message','Mã PIN hoặc tài khoản chưa đúng.'); end if;
 select * into pin from public.qlpm_student_desktop_pins where student_id=st.id for update;
 if pin.student_id is null then return jsonb_build_object('ok',false,'message','Giáo viên chưa cấp PIN cho tài khoản này.'); end if;
 if pin.locked_until is not null and pin.locked_until>now() then
  return jsonb_build_object('ok',false,'message','Đã nhập sai nhiều lần. Vui lòng thử lại sau hoặc nhờ giáo viên cấp PIN mới.');
 end if;
 if pin.pin_hash<>extensions.crypt(p_pin,pin.pin_hash) then
  v_attempts:=case when pin.locked_until is not null and pin.locked_until<=now() then 1
   else coalesce(pin.failed_attempts,0)+1 end;
  update public.qlpm_student_desktop_pins set failed_attempts=v_attempts,
    locked_until=case when v_attempts>=5 then now()+interval '15 minutes' else null end
  where student_id=st.id;
  return jsonb_build_object('ok',false,'message','Mã PIN hoặc tài khoản chưa đúng.');
 end if;
 update public.qlpm_student_desktop_pins set failed_attempts=0,locked_until=null where student_id=st.id;
 session_token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.qlpm_student_desktop_sessions(token_hash,student_id,device_id)
 values(encode(extensions.digest(session_token,'sha256'),'hex'),st.id,left(coalesce(p_device_id,''),128));
 return jsonb_build_object('ok',true,'session_token',session_token,'student_name',st.full_name,
  'student_id',st.id,'school_id',st.school_id,'class_name',cl.class_name,'expires_minutes',90);
end $$;
revoke all on function public.qlpm_student_desktop_login(text,uuid,text,text) from public;
grant execute on function public.qlpm_student_desktop_login(text,uuid,text,text) to anon,authenticated;

create or replace function public.qlpm_student_desktop_whoami(p_session_token text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare ss public.qlpm_student_desktop_sessions%rowtype;
 st public.students%rowtype;
begin
 if coalesce(p_session_token,'') !~ '^[a-f0-9]{64}$' then return null; end if;
 select * into ss from public.qlpm_student_desktop_sessions
 where token_hash=encode(extensions.digest(p_session_token,'sha256'),'hex')
  and revoked_at is null and expires_at>now() and last_seen_at>now()-interval '20 minutes'
 for update;
 if ss.student_id is null then return null; end if;
 select * into st from public.students where id=ss.student_id and status='active';
 if st.id is null then return null; end if;
 update public.qlpm_student_desktop_sessions set last_seen_at=now() where token_hash=ss.token_hash;
 return jsonb_build_object('student_id',st.id,'name',st.full_name,'class_name',st.class_name,
  'school_id',st.school_id,'session_expires_at',ss.expires_at,
  'pc',(select c.computer_code from public.qlpm_student_desktop_pc_requests pr
    join public.computers c on c.id=pr.computer_id where pr.student_id=st.id and pr.status='approved'
    order by pr.reviewed_at desc limit 1));
end $$;
revoke all on function public.qlpm_student_desktop_whoami(text) from public;
grant execute on function public.qlpm_student_desktop_whoami(text) to anon,authenticated;

create or replace function public.qlpm_student_desktop_logout(p_session_token text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if coalesce(p_session_token,'') !~ '^[a-f0-9]{64}$' then return false; end if;
 update public.qlpm_student_desktop_sessions set revoked_at=now()
 where token_hash=encode(extensions.digest(p_session_token,'sha256'),'hex') and revoked_at is null;
 return found;
end $$;
revoke all on function public.qlpm_student_desktop_logout(text) from public;
grant execute on function public.qlpm_student_desktop_logout(text) to anon,authenticated;

create or replace function public.qlpm_student_desktop_request_pin_reset(p_class_code text,p_student_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare cl public.classes%rowtype;st public.students%rowtype;
begin
 select * into cl from public.classes where archived_at is null and
  (registration_code=upper(trim(p_class_code)) or upper(trim(p_class_code))=any(legacy_registration_codes)) limit 1;
 select * into st from public.students where id=p_student_id and school_id=cl.school_id and status='active'
  and (class_id=cl.id or (class_id is null and class_name=cl.class_name));
 if st.id is null then return jsonb_build_object('ok',true); end if; -- generic
 if not exists(select 1 from public.qlpm_student_desktop_pin_requests where student_id=st.id
   and created_at>now()-interval '12 hours' and status='pending') then
  insert into public.qlpm_student_desktop_pin_requests(student_id,school_id) values(st.id,st.school_id);
 end if;
 return jsonb_build_object('ok',true,'message','Đã gửi yêu cầu đến giáo viên.');
end $$;
revoke all on function public.qlpm_student_desktop_request_pin_reset(text,uuid) from public;
grant execute on function public.qlpm_student_desktop_request_pin_reset(text,uuid) to anon,authenticated;

create or replace function public.qlpm_teacher_desktop_requests(p_school_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.can_access_school(p_school_id) then raise exception 'Không có quyền quản lý trường này'; end if;
 return jsonb_build_object(
 'pin_requests',coalesce((select jsonb_agg(jsonb_build_object(
    'id',r.id,'student_id',s.id,'name',s.full_name,'class_name',s.class_name,'created_at',r.created_at
  ) order by r.created_at desc) from public.qlpm_student_desktop_pin_requests r
  join public.students s on s.id=r.student_id where r.school_id=p_school_id and r.status='pending'),'[]'::jsonb),
 'pc_requests',coalesce((select jsonb_agg(jsonb_build_object(
   'id',r.id,'student_id',s.id,'name',s.full_name,'class_name',s.class_name,
   'computer_code',c.computer_code,'created_at',r.created_at
  ) order by r.created_at desc) from public.qlpm_student_desktop_pc_requests r
  join public.students s on s.id=r.student_id join public.computers c on c.id=r.computer_id
  where r.school_id=p_school_id and r.status='pending'),'[]'::jsonb));
end $$;
revoke all on function public.qlpm_teacher_desktop_requests(uuid) from public;
grant execute on function public.qlpm_teacher_desktop_requests(uuid) to authenticated;

create or replace function public.qlpm_teacher_review_pin_request(p_request_id uuid,p_approve boolean default true)
returns text language plpgsql volatile security definer set search_path='' as $$
declare r public.qlpm_student_desktop_pin_requests%rowtype;result text;
begin
 select * into r from public.qlpm_student_desktop_pin_requests where id=p_request_id and status='pending' for update;
 if r.id is null or not public.can_access_school(r.school_id) then raise exception 'Không có quyền xét duyệt'; end if;
 if p_approve then result:=public.qlpm_teacher_issue_student_pin(r.student_id); end if;
 update public.qlpm_student_desktop_pin_requests set status=case when p_approve then 'approved' else 'rejected' end,
 reviewed_at=now(),reviewed_by=auth.uid() where id=r.id;
 return result;
end $$;
revoke all on function public.qlpm_teacher_review_pin_request(uuid,boolean) from public;
grant execute on function public.qlpm_teacher_review_pin_request(uuid,boolean) to authenticated;

create or replace function public.qlpm_student_desktop_request_pc(p_session_token text,p_pc text,p_device_id text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare who jsonb; sid uuid; school uuid; pc public.computers%rowtype;
begin
 who:=public.qlpm_student_desktop_whoami(p_session_token);
 if who is null then return jsonb_build_object('ok',false,'message','Phiên đăng nhập đã hết hạn.'); end if;
 sid:=(who->>'student_id')::uuid; school:=(who->>'school_id')::uuid;
 select * into pc from public.computers where school_id=school and upper(computer_code)=upper(trim(p_pc)) limit 1;
 if pc.id is null then return jsonb_build_object('ok',false,'message','PC này không tồn tại trong trường.'); end if;
 if exists(select 1 from public.qlpm_student_desktop_pc_requests where student_id=sid
   and computer_id=pc.id and status='pending' and created_at>now()-interval '12 hours') then
  return jsonb_build_object('ok',true,'message','Giáo viên đang xem xét yêu cầu kết nối PC.');
 end if;
 insert into public.qlpm_student_desktop_pc_requests(student_id,school_id,computer_id,device_id)
 values(sid,school,pc.id,left(coalesce(p_device_id,''),128));
 return jsonb_build_object('ok',true,'message','Đã gửi yêu cầu ghép PC. Giáo viên sẽ kiểm tra trước khi xác nhận.');
end $$;
revoke all on function public.qlpm_student_desktop_request_pc(text,text,text) from public;
grant execute on function public.qlpm_student_desktop_request_pc(text,text,text) to anon,authenticated;

create or replace function public.qlpm_teacher_review_pc_request(p_request_id uuid,p_approve boolean default true)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare r public.qlpm_student_desktop_pc_requests%rowtype; c public.computers%rowtype;
 existing int; already int;
begin
 select * into r from public.qlpm_student_desktop_pc_requests where id=p_request_id and status='pending' for update;
 if r.id is null or not public.can_access_school(r.school_id) then raise exception 'Không có quyền xét duyệt'; end if;
 select * into c from public.computers where id=r.computer_id and school_id=r.school_id for update;
 if c.id is null then raise exception 'Máy không thuộc trường'; end if;
 if p_approve then
  select count(*) into existing from public.computer_assignments a
  where a.computer_id=c.id and a.active and a.student_id<>r.student_id;
  if existing >= c.capacity then raise exception 'Máy đang đủ chỗ. Không thay đổi phân công hiện có.'; end if;
  select count(*) into already from public.computer_assignments
   where active and student_id=r.student_id and computer_id<>c.id;
  if already>0 then raise exception 'Học sinh đang có PC khác. Gỡ phân công cũ trước khi duyệt.'; end if;
  if not exists(select 1 from public.computer_assignments where computer_id=c.id and student_id=r.student_id and active) then
   insert into public.computer_assignments(school_id,computer_id,student_id,assigned_date,active)
   values(r.school_id,r.computer_id,r.student_id,current_date,true);
  end if;
  update public.qlpm_student_desktop_pc_requests set status='rejected',reviewed_at=now(),reviewed_by=auth.uid()
   where student_id=r.student_id and id<>r.id and status='approved';
 end if;
 update public.qlpm_student_desktop_pc_requests set status=case when p_approve then 'approved' else 'rejected' end,
 reviewed_at=now(),reviewed_by=auth.uid() where id=r.id;
 return jsonb_build_object('ok',true,'approved',p_approve);
end $$;
revoke all on function public.qlpm_teacher_review_pc_request(uuid,boolean) from public;
grant execute on function public.qlpm_teacher_review_pc_request(uuid,boolean) to authenticated;
