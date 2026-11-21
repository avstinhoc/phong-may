-- Applied in Supabase as migration 20261121133705.
-- Fix ambiguous full_name PL/pgSQL variable. Keep student rows and permissions unchanged.
CREATE OR REPLACE FUNCTION public.qlpm_student_web_register(p_code text, p_full_name text, p_username text, p_pin text, p_pc text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.classes%rowtype; pc public.computers%rowtype;
  r public.student_registrations%rowtype;
  uname text:=lower(trim(coalesce(p_username,'')));
  v_full_name text:=trim(regexp_replace(coalesce(p_full_name,''),'\s+',' ','g'));
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
  if length(v_full_name) not between 5 and 90 or
     position(' ' in v_full_name)=0 or
     v_full_name !~ '^[[:alpha:] ]+$' then
    return jsonb_build_object('ok',false,'message','Nhập họ và tên thật đầy đủ, không có số hoặc ký tự lạ.'); end if;
  review:=public.ic3_name_review(v_full_name);
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
    and lower(regexp_replace(trim(v_full_name),'\s+',' ','g'))=
        lower(regexp_replace(trim(student_registrations.full_name),'\s+',' ','g'))
  ) then return jsonb_build_object('ok',false,'message','Hồ sơ này đang chờ giáo viên duyệt.'); end if;
  if (select count(*) from public.student_registrations
      where registration_code=c.registration_code and created_at>now()-interval '10 minutes')>120 then
    return jsonb_build_object('ok',false,'message','Có quá nhiều yêu cầu. Vui lòng thử lại sau.'); end if;
  insert into public.student_registrations
    (registration_code,full_name,gender,computer_code,note,status,review_note)
  values (c.registration_code,initcap(lower(v_full_name)),'Khác',clean_pc,
    'Đăng ký qua Student Web','pending',
    case when review->>'decision'='review' then review->>'reason' else null end)
  returning * into r;
  insert into public.qlpm_student_web_credentials
    (registration_id,school_id,class_id,username,pin_hash)
  values (r.id,c.school_id,c.id,uname,extensions.crypt(p_pin,extensions.gen_salt('bf',10)));
  return jsonb_build_object('ok',true,'status','pending','message','Đã gửi đăng ký. Chờ giáo viên duyệt trước khi đăng nhập.');
end $function$
;
