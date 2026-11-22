-- Student Web profile review and self-service PIN. Additive and privacy-preserving.
-- Uploaded avatars are resized client-side and stored as tiny private JPEG data URLs.
create table if not exists public.qlpm_student_profile_data (
 student_id uuid primary key references public.students(id) on delete cascade,
 avatar_data text,
 updated_at timestamptz not null default now(),
 constraint profile_avatar_size check (avatar_data is null or
   (length(avatar_data)<=35000 and avatar_data ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$'))
);
create table if not exists public.qlpm_student_profile_requests (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete cascade,
 school_id uuid not null references public.schools(id) on delete cascade,
 class_id uuid not null references public.classes(id),
 full_name text not null,
 date_of_birth date,
 gender text not null default '',
 avatar_data text,
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 submitted_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references public.profiles(id),
 constraint student_profile_gender check (gender in ('','Nam','Nữ','Khác')),
 constraint student_profile_avatar_size check (avatar_data is null or
   (length(avatar_data)<=35000 and avatar_data ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$'))
);
create unique index if not exists qlpm_student_profile_single_pending
 on public.qlpm_student_profile_requests(student_id) where status='pending';
create index if not exists qlpm_student_profile_school_pending
 on public.qlpm_student_profile_requests(school_id,status,submitted_at desc);
alter table public.qlpm_student_profile_data enable row level security;
alter table public.qlpm_student_profile_requests enable row level security;
revoke all on public.qlpm_student_profile_data from public,anon,authenticated;
revoke all on public.qlpm_student_profile_requests from public,anon,authenticated;

-- Student profile data can only be accessed through a live, server-validated session.
create or replace function public.qlpm_student_web_profile(p_session_token text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 who jsonb;
 st public.students%rowtype;
 cred public.qlpm_student_web_credentials%rowtype;
 pending public.qlpm_student_profile_requests%rowtype;
 avatar text;
begin
 who:=public.qlpm_student_web_whoami(p_session_token);
 if who is null then return null; end if;
 select * into st from public.students
 where id=(who->>'student_id')::uuid and status='active';
 if st.id is null then return null; end if;
 select * into cred from public.qlpm_student_web_credentials where student_id=st.id;
 if cred.registration_id is null then return null; end if;
 select avatar_data into avatar from public.qlpm_student_profile_data where student_id=st.id;
 select * into pending from public.qlpm_student_profile_requests
 where student_id=st.id and status='pending' order by submitted_at desc limit 1;
 return jsonb_build_object(
  'student_id',st.id,'name',st.full_name,'class_id',cred.class_id,
  'class_name',(select class_name from public.classes where id=cred.class_id),
  'date_of_birth',st.date_of_birth,
  'gender',coalesce(nullif(st.gender,''),(select nullif(gender,'') from public.student_results where student_id=st.id limit 1),''),
  'avatar_data',avatar,
  'pc',who->>'pc','pc_requested',who->>'pc_requested',
  'classes',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.class_name)
     order by c.class_name)
     from public.classes c where c.school_id=st.school_id
       and c.archived_at is null and c.retired_at is null),'[]'::jsonb),
  'pending',case when pending.id is null then null else jsonb_build_object(
    'id',pending.id,'name',pending.full_name,'class_id',pending.class_id,
    'date_of_birth',pending.date_of_birth,'gender',pending.gender,
    'submitted_at',pending.submitted_at) end
 );
end $$;
revoke all on function public.qlpm_student_web_profile(text) from public;
grant execute on function public.qlpm_student_web_profile(text) to anon,authenticated;

create or replace function public.qlpm_student_web_submit_profile(
 p_session_token text,p_full_name text,p_class_id uuid,
 p_date_of_birth date,p_gender text,p_avatar_data text
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 who jsonb;
 st public.students%rowtype;
 cls public.classes%rowtype;
 nm text:=trim(regexp_replace(coalesce(p_full_name,''),'\s+',' ','g'));
 review jsonb;
begin
 who:=public.qlpm_student_web_whoami(p_session_token);
 if who is null then return jsonb_build_object('ok',false,'message','Phiên đăng nhập đã hết hạn.'); end if;
 select * into st from public.students where id=(who->>'student_id')::uuid and status='active' for update;
 if st.id is null then return jsonb_build_object('ok',false,'message','Không tìm thấy học sinh.'); end if;
 select * into cls from public.classes where id=p_class_id and school_id=st.school_id
  and archived_at is null and retired_at is null;
 if cls.id is null then return jsonb_build_object('ok',false,'message','Lớp không hợp lệ hoặc không thuộc trường.'); end if;
 if length(nm) not between 5 and 90 or array_length(regexp_split_to_array(nm,'\s+'),1)<2
    or nm !~ '^[[:alpha:] ]+$' then
   return jsonb_build_object('ok',false,'message','Họ tên cần đầy đủ, không chứa số hay ký tự lạ.'); end if;
 review:=public.ic3_name_review(nm);
 if review->>'decision'='reject' then
   return jsonb_build_object('ok',false,'message',coalesce(review->>'reason','Họ tên không hợp lệ.')); end if;
 if coalesce(p_gender,'') not in ('','Nam','Nữ','Khác') then
   return jsonb_build_object('ok',false,'message','Giới tính không hợp lệ.'); end if;
 if p_date_of_birth is not null and (p_date_of_birth<date '1990-01-01'
   or p_date_of_birth>current_date-interval '4 years') then
   return jsonb_build_object('ok',false,'message','Ngày sinh không hợp lệ.'); end if;
 if p_avatar_data is not null and
   (length(p_avatar_data)>35000 or
    p_avatar_data !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$') then
   return jsonb_build_object('ok',false,'message','Ảnh đại diện quá lớn hoặc không đúng định dạng.'); end if;
 if exists(select 1 from public.qlpm_student_profile_requests
   where student_id=st.id and status='pending') then
   return jsonb_build_object('ok',false,'message','Hồ sơ đang chờ giáo viên duyệt.'); end if;
 insert into public.qlpm_student_profile_requests
 (student_id,school_id,class_id,full_name,date_of_birth,gender,avatar_data)
 values (st.id,st.school_id,cls.id,nm,p_date_of_birth,coalesce(p_gender,''),p_avatar_data);
 return jsonb_build_object('ok',true,'message','Đã gửi hồ sơ đến giáo viên. Các thông tin sẽ thay đổi sau khi được duyệt.');
end $$;
revoke all on function public.qlpm_student_web_submit_profile(text,text,uuid,date,text,text) from public;
grant execute on function public.qlpm_student_web_submit_profile(text,text,uuid,date,text,text) to anon,authenticated;

create or replace function public.qlpm_teacher_student_profile_requests(p_school_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.can_access_school(p_school_id) then
   raise exception 'Không được xem hồ sơ trường này.'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
   'id',r.id,'student_id',r.student_id,'student_name',s.full_name,
   'class_name',c.class_name,'new_class_name',nc.class_name,
   'full_name',r.full_name,'date_of_birth',r.date_of_birth,'gender',r.gender,
   'avatar_data',r.avatar_data,'submitted_at',r.submitted_at,
   'reviewable',(public.is_admin() or
      (c.created_by=auth.uid() and nc.created_by=auth.uid()))
  ) order by r.submitted_at desc)
  from public.qlpm_student_profile_requests r
  join public.students s on s.id=r.student_id and s.status='active'
  join public.qlpm_student_web_credentials cred on cred.student_id=s.id
  join public.classes c on c.id=cred.class_id
  join public.classes nc on nc.id=r.class_id
  where r.school_id=p_school_id and r.status='pending'
   and (public.is_admin() or c.created_by=auth.uid())
 ),'[]'::jsonb);
end $$;
revoke all on function public.qlpm_teacher_student_profile_requests(uuid) from public;
grant execute on function public.qlpm_teacher_student_profile_requests(uuid) to authenticated;

create or replace function public.qlpm_teacher_review_student_profile(
 p_request_id uuid,p_approve boolean
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 r public.qlpm_student_profile_requests%rowtype;
 st public.students%rowtype;
 cred public.qlpm_student_web_credentials%rowtype;
 src public.classes%rowtype;
 dest public.classes%rowtype;
begin
 if auth.uid() is null then raise exception 'Cần đăng nhập tài khoản giáo viên.'; end if;
 select * into r from public.qlpm_student_profile_requests
  where id=p_request_id and status='pending' for update;
 if r.id is null then raise exception 'Yêu cầu không còn chờ duyệt.'; end if;
 select * into st from public.students where id=r.student_id and status='active' for update;
 select * into cred from public.qlpm_student_web_credentials where student_id=st.id for update;
 select * into src from public.classes where id=cred.class_id and school_id=st.school_id;
 select * into dest from public.classes where id=r.class_id and school_id=st.school_id
  and archived_at is null and retired_at is null;
 if st.id is null or cred.registration_id is null or dest.id is null
  or st.school_id<>r.school_id or not public.can_access_school(r.school_id) then
  raise exception 'Không có quyền duyệt hoặc dữ liệu không hợp lệ.'; end if;
 if not (public.is_admin() or (src.created_by=auth.uid() and dest.created_by=auth.uid())) then
  raise exception 'Chuyển sang lớp của giáo viên khác cần quản trị viên duyệt.'; end if;
 if p_approve then
  update public.students set full_name=r.full_name,class_id=r.class_id,
    class_name=dest.class_name,date_of_birth=r.date_of_birth,gender=r.gender
   where id=st.id;
  update public.qlpm_student_web_credentials set class_id=r.class_id where student_id=st.id;
  insert into public.student_results(school_id,student_id,gender)
    values(r.school_id,st.id,r.gender)
   on conflict(student_id) do update set gender=excluded.gender,updated_at=now();
  insert into public.qlpm_student_profile_data(student_id,avatar_data)
   values(st.id,r.avatar_data)
   on conflict(student_id) do update set avatar_data=excluded.avatar_data,updated_at=now();
 end if;
 update public.qlpm_student_profile_requests set
  status=case when p_approve then 'approved' else 'rejected' end,
  reviewed_at=now(),reviewed_by=auth.uid()
 where id=r.id;
 return jsonb_build_object('ok',true,'approved',p_approve);
end $$;
revoke all on function public.qlpm_teacher_review_student_profile(uuid,boolean) from public;
grant execute on function public.qlpm_teacher_review_student_profile(uuid,boolean) to authenticated;

create or replace function public.qlpm_student_web_change_pin(
 p_session_token text,p_old_pin text,p_new_pin text
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 who jsonb;
 cred public.qlpm_student_web_credentials%rowtype;
 tries integer;
begin
 who:=public.qlpm_student_web_whoami(p_session_token);
 if who is null then return jsonb_build_object('ok',false,'message','Phiên đăng nhập hết hạn.'); end if;
 if coalesce(p_new_pin,'') !~ '^[0-9]{6}$' or p_new_pin ~ '^([0-9])\1{5}$' then
  return jsonb_build_object('ok',false,'message','PIN mới phải có 6 chữ số, không gồm 6 số giống nhau.'); end if;
 select * into cred from public.qlpm_student_web_credentials
  where student_id=(who->>'student_id')::uuid for update;
 if cred.registration_id is null or cred.locked_until>now() then
  return jsonb_build_object('ok',false,'message','PIN tạm khóa hoặc tài khoản không hợp lệ.'); end if;
 if p_old_pin is null or cred.pin_hash<>extensions.crypt(p_old_pin,cred.pin_hash) then
  tries:=coalesce(cred.failed_attempts,0)+1;
  update public.qlpm_student_web_credentials set failed_attempts=tries,
    locked_until=case when tries>=5 then now()+interval '15 minutes' else null end
   where registration_id=cred.registration_id;
  return jsonb_build_object('ok',false,'message','PIN hiện tại không đúng.'); end if;
 if p_old_pin=p_new_pin then
  return jsonb_build_object('ok',false,'message','PIN mới cần khác PIN đang dùng.'); end if;
 update public.qlpm_student_web_credentials set
  pin_hash=extensions.crypt(p_new_pin,extensions.gen_salt('bf',10)),
  failed_attempts=0,locked_until=null where registration_id=cred.registration_id;
 update public.qlpm_student_desktop_sessions set revoked_at=now()
  where student_id=cred.student_id and revoked_at is null;
 return jsonb_build_object('ok',true,'message','Đổi PIN thành công. Hãy đăng nhập lại bằng PIN mới.');
end $$;
revoke all on function public.qlpm_student_web_change_pin(text,text,text) from public;
grant execute on function public.qlpm_student_web_change_pin(text,text,text) to anon,authenticated;

-- The competition banner reads only the current student's aggregates.
create or replace function public.qlpm_student_web_competition(p_session_token text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare who jsonb; w record; violations integer:=0;
begin
 who:=public.qlpm_student_web_whoami(p_session_token);
 if who is null then return null; end if;
 select earned,available,effect_score,chances,flame_state into w
  from public.ic3_star_wallets
  where student_id=(who->>'student_id')::uuid
    and school_id=(who->>'school_id')::uuid;
 select coalesce(v.violations,0) into violations from public.ic3_student_violation_totals v
  where v.student_id=(who->>'student_id')::uuid and v.school_id=(who->>'school_id')::uuid;
 return jsonb_build_object(
  'name',who->>'name','class_name',who->>'class_name',
  'available',coalesce(w.available,0),'earned',coalesce(w.earned,0),
  'violations',coalesce(violations,0),'effect_score',coalesce(w.effect_score,0),
  'chances',coalesce(w.chances,3),'flame_state',coalesce(w.flame_state,'off'));
end $$;
revoke all on function public.qlpm_student_web_competition(text) from public;
grant execute on function public.qlpm_student_web_competition(text) to anon,authenticated;
