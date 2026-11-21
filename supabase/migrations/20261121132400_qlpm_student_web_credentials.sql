-- Student Web accounts: approved classroom identity + student-created PIN.
-- Additive migration. Does not delete existing pupils, classes, registrations or PC assignments.
create table if not exists public.qlpm_student_web_credentials (
  registration_id uuid primary key references public.student_registrations(id) on delete cascade,
  student_id uuid unique references public.students(id) on delete set null,
  school_id uuid not null references public.schools(id),
  class_id uuid not null references public.classes(id),
  username text not null unique,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  constraint qlpm_student_web_username_format check (username ~ '^[a-z][a-z0-9._]{3,23}$')
);
create index if not exists qlpm_student_web_school_idx on public.qlpm_student_web_credentials(school_id);
alter table public.qlpm_student_web_credentials enable row level security;
revoke all on public.qlpm_student_web_credentials from public, anon, authenticated;
-- Credential data is read ONLY through the audited teacher RPC, not a public table policy.

create or replace function public.qlpm_student_web_register(
  p_code text,p_full_name text,p_username text,p_pin text,p_pc text default null
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  c public.classes%rowtype; pc public.computers%rowtype;
  r public.student_registrations%rowtype;
  uname text:=lower(trim(coalesce(p_username,'')));
  full_name text:=trim(regexp_replace(coalesce(p_full_name,''),'\s+',' ','g'));
  clean_pc text; review jsonb;
begin
  if length(coalesce(p_code,'')) not between 4 and 120 then
    return jsonb_build_object('ok',false,'message','Mã lớp không hợp lệ.'); end if;
  select * into c from public.classes
   where archived_at is null and retired_at is null
   and (registration_code=upper(trim(p_code)) or upper(trim(p_code))=any(legacy_registration_codes))
   limit 1;
  if c.id is null then return jsonb_build_object('ok',false,'message','Không tìm thấy mã lớp.'); end if;
  if uname !~ '^[a-z][a-z0-9._]{3,23}$' then
    return jsonb_build_object('ok',false,'message','Tên đăng nhập dài 4–24 ký tự, bắt đầu bằng chữ, chỉ gồm a–z, số, dấu chấm hoặc gạch dưới.'); end if;
  if p_pin !~ '^[0-9]{6}$' or p_pin ~ '^([0-9])\1{5}$' then
    return jsonb_build_object('ok',false,'message','PIN cần đúng 6 chữ số và không được gồm toàn một chữ số lặp lại.'); end if;
  if length(full_name) not between 5 and 90 or
     array_length(regexp_split_to_array(full_name,'\s+'),1)<2 or
     full_name !~ '^[[:alpha:] ]+$' then
    return jsonb_build_object('ok',false,'message','Nhập họ và tên thật đầy đủ, không có số hoặc ký tự lạ.'); end if;
  review:=public.ic3_name_review(full_name);
  if review->>'decision'='reject' then
    return jsonb_build_object('ok',false,'message',coalesce(review->>'reason','Tên cần giáo viên kiểm tra.')); end if;
  begin
    clean_pc:=public.ic3_normalize_pc(p_pc);
  exception when others then
    return jsonb_build_object('ok',false,'message','Mã máy không hợp lệ.'); end;
  if clean_pc is not null and not exists(
    select 1 from public.computers where school_id=c.school_id and computer_code=clean_pc
  ) then return jsonb_build_object('ok',false,'message','PC này chưa có trong trường.'); end if;
  perform pg_advisory_xact_lock(hashtextextended('studentweb:'||uname,0));
  if exists(select 1 from public.qlpm_student_web_credentials where username=uname) then
    return jsonb_build_object('ok',false,'message','Tên đăng nhập đã được sử dụng.'); end if;
  if exists(select 1 from public.student_registrations
    where registration_code=c.registration_code and status='pending'
    and lower(regexp_replace(trim(full_name),'\s+',' ','g'))=
        lower(regexp_replace(trim(student_registrations.full_name),'\s+',' ','g'))
  ) then return jsonb_build_object('ok',false,'message','Hồ sơ này đang chờ giáo viên duyệt.'); end if;
  if (select count(*) from public.student_registrations
      where registration_code=c.registration_code and created_at>now()-interval '10 minutes')>120 then
    return jsonb_build_object('ok',false,'message','Có quá nhiều yêu cầu. Vui lòng thử lại sau.'); end if;
  insert into public.student_registrations
    (registration_code,full_name,gender,computer_code,note,status,review_note)
  values (c.registration_code,initcap(lower(full_name)),'Khác',clean_pc,
    'Đăng ký qua Student Web','pending',
    case when review->>'decision'='review' then review->>'reason' else null end)
  returning * into r;
  insert into public.qlpm_student_web_credentials
    (registration_id,school_id,class_id,username,pin_hash)
  values (r.id,c.school_id,c.id,uname,extensions.crypt(p_pin,extensions.gen_salt('bf',10)));
  return jsonb_build_object('ok',true,'status','pending','message','Đã gửi đăng ký. Chờ giáo viên duyệt trước khi đăng nhập.');
end $$;
revoke all on function public.qlpm_student_web_register(text,text,text,text,text) from public;
grant execute on function public.qlpm_student_web_register(text,text,text,text,text) to anon,authenticated;

create or replace function public.qlpm_teacher_student_web_approve(p_registration_id uuid)
returns uuid language plpgsql volatile security definer set search_path='' as $$
declare sid uuid; cred public.qlpm_student_web_credentials%rowtype;
begin
  select * into cred from public.qlpm_student_web_credentials
   where registration_id=p_registration_id for update;
  sid:=public.approve_registration(p_registration_id);
  if cred.registration_id is not null then
    if exists(select 1 from public.qlpm_student_web_credentials
       where student_id=sid and registration_id<>p_registration_id) then
      raise exception 'Học sinh này đã có tài khoản khác. Giáo viên cần đối chiếu trước khi duyệt.';
    end if;
    update public.qlpm_student_web_credentials
       set student_id=sid,approved_at=now()
     where registration_id=p_registration_id;
  end if;
  return sid;
end $$;
revoke all on function public.qlpm_teacher_student_web_approve(uuid) from public;
grant execute on function public.qlpm_teacher_student_web_approve(uuid) to authenticated;

create or replace function public.qlpm_teacher_student_web_accounts(p_school_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.can_access_school(p_school_id) then
    raise exception 'Không có quyền xem tài khoản trường này.'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'registration_id',v.registration_id,
      'student_id',v.student_id,
      'username',v.username,
      'pin_status',case when v.student_id is null then 'Chờ duyệt' else 'Đã tạo' end
    ) order by v.created_at desc)
    from public.qlpm_student_web_credentials v where v.school_id=p_school_id
  ),'[]'::jsonb);
end $$;
revoke all on function public.qlpm_teacher_student_web_accounts(uuid) from public;
grant execute on function public.qlpm_teacher_student_web_accounts(uuid) to authenticated;

create or replace function public.qlpm_student_web_login(p_username text,p_pin text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  cred public.qlpm_student_web_credentials%rowtype;
  st public.students%rowtype; cl public.classes%rowtype;
  r public.student_registrations%rowtype;
  tries integer; token text;
begin
  if coalesce(p_username,'') !~ '^[a-zA-Z][a-zA-Z0-9._]{3,23}$'
     or coalesce(p_pin,'') !~ '^[0-9]{6}$' then
    return jsonb_build_object('ok',false,'message','Tên đăng nhập hoặc PIN không đúng.'); end if;
  select * into cred from public.qlpm_student_web_credentials
    where username=lower(trim(p_username)) for update;
  if cred.registration_id is null then
    return jsonb_build_object('ok',false,'message','Tên đăng nhập hoặc PIN không đúng.'); end if;
  select * into r from public.student_registrations where id=cred.registration_id;
  select * into st from public.students where id=cred.student_id and school_id=cred.school_id and status='active';
  select * into cl from public.classes where id=cred.class_id and school_id=cred.school_id and archived_at is null;
  if r.status<>'approved' or st.id is null or cl.id is null then
    return jsonb_build_object('ok',false,'message','Tài khoản chưa được duyệt hoặc không còn hoạt động.'); end if;
  if cred.locked_until is not null and cred.locked_until>now() then
    return jsonb_build_object('ok',false,'message','Tài khoản tạm khóa sau nhiều lần sai PIN. Vui lòng thử lại sau 15 phút.'); end if;
  if cred.pin_hash<>extensions.crypt(p_pin,cred.pin_hash) then
    tries:=case when cred.locked_until is not null and cred.locked_until<=now() then 1
      else coalesce(cred.failed_attempts,0)+1 end;
    update public.qlpm_student_web_credentials
       set failed_attempts=tries,
           locked_until=case when tries>=5 then now()+interval '15 minutes' else null end
     where registration_id=cred.registration_id;
    return jsonb_build_object('ok',false,'message','Tên đăng nhập hoặc PIN không đúng.'); end if;
  update public.qlpm_student_web_credentials set failed_attempts=0,locked_until=null
    where registration_id=cred.registration_id;
  token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.qlpm_student_desktop_sessions(token_hash,student_id,device_id)
    values(encode(extensions.digest(token,'sha256'),'hex'),st.id,'web');
  return jsonb_build_object('ok',true,'session_token',token,
    'student_id',st.id,'student_name',st.full_name,'class_name',cl.class_name,
    'class_code',cl.registration_code,'school_id',st.school_id,'username',cred.username);
end $$;
revoke all on function public.qlpm_student_web_login(text,text) from public;
grant execute on function public.qlpm_student_web_login(text,text) to anon,authenticated;

create or replace function public.qlpm_student_web_whoami(p_session_token text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare who jsonb; cred public.qlpm_student_web_credentials%rowtype; cl public.classes%rowtype;
begin
  who:=public.qlpm_student_desktop_whoami(p_session_token);
  if who is null then return null; end if;
  select * into cred from public.qlpm_student_web_credentials
   where student_id=(who->>'student_id')::uuid;
  if cred.registration_id is null then return null; end if;
  select * into cl from public.classes where id=cred.class_id and archived_at is null;
  if cl.id is null then return null; end if;
  return who||jsonb_build_object('class_code',cl.registration_code,'username',cred.username);
end $$;
revoke all on function public.qlpm_student_web_whoami(text) from public;
grant execute on function public.qlpm_student_web_whoami(text) to anon,authenticated;

-- No RPC discloses pin_hash or the original PIN. PIN reset and recovery must be teacher-approved.
