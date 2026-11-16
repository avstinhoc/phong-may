CREATE OR REPLACE FUNCTION public.ic3_submit_registration(
 p_code text,p_full_name text,p_gender text,p_computer text DEFAULT NULL,p_note text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE c public.classes%ROWTYPE;
  student public.students%ROWTYPE;
  request public.student_registrations%ROWTYPE;
  pc public.computers%ROWTYPE;
  clean_name text; folded text; clean_pc text;
  response text; seats integer; valid_gender text:=trim(coalesce(p_gender,''));
  applicant_name text;
BEGIN
 IF length(coalesce(p_code,'')) NOT BETWEEN 4 AND 120 THEN
  RETURN jsonb_build_object('status','invalid','message','Mã lớp không hợp lệ.'); END IF;
 SELECT * INTO c FROM public.classes WHERE archived_at IS NULL AND (
 registration_code=upper(trim(p_code)) OR upper(trim(p_code))=ANY(legacy_registration_codes)) LIMIT 1;
 IF NOT FOUND THEN
  RETURN jsonb_build_object('status','invalid','message','Mã lớp không tồn tại hoặc đã ngừng đăng ký.'); END IF;
 clean_name:=trim(regexp_replace(coalesce(p_full_name,''),'\s+',' ','g'));
 folded:=lower(extensions.unaccent(clean_name));
 IF valid_gender NOT IN ('Nam','Nữ','Khác') THEN
  RETURN jsonb_build_object('status','invalid','message','Vui lòng chọn giới tính.'); END IF;
 IF length(clean_name) NOT BETWEEN 5 AND 90 OR
 array_length(regexp_split_to_array(clean_name,'\s+'),1)<2 OR
 clean_name !~ '^[[:alpha:] ]+$' THEN
  RETURN jsonb_build_object('status','rejected','message','Vui lòng nhập họ và tên thật có dấu, ít nhất hai từ và không dùng ký tự đặc biệt.'); END IF;
 IF folded ~ '(dep trai|vippro|vip pro|ba khi|soai ca|hot boy|hot girl|sieu nhan|admin|test test|abc|nguoi dep|ngau loi|pro max)' THEN
  RETURN jsonb_build_object('status','rejected','message','Tên đăng ký có dấu hiệu biệt danh hoặc chưa nghiêm túc. Hãy nhập họ tên thật có dấu; nếu đây là tên trên giấy tờ, liên hệ giáo viên.'); END IF;
 -- Preserve title-case for Vietnamese as best effort; the client also normalizes names.
 applicant_name:=initcap(lower(clean_name));
 BEGIN
  clean_pc:=public.ic3_normalize_pc(p_computer);
 EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('status','invalid','message',SQLERRM);
 END;
 IF clean_pc IS NOT NULL THEN
  SELECT * INTO pc FROM public.computers
    WHERE school_id=c.school_id AND computer_code=clean_pc LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','invalid','message','Máy '||clean_pc||' chưa được tạo trong trường. Hãy chọn máy khác hoặc để trống.'); END IF;
 END IF;
 -- Serialize registrations for the same class+name to prevent concurrent duplicates.
 PERFORM pg_advisory_xact_lock(hashtextextended(c.id::text||':'||lower(clean_name),0));
 -- Do not create another student for the same real-name and class.
 SELECT * INTO student FROM public.students s
 WHERE s.school_id=c.school_id AND (s.class_id=c.id OR (s.class_id IS NULL AND s.class_name=c.class_name))
   AND lower(regexp_replace(trim(s.full_name),'\s+',' ','g'))=lower(clean_name)
   AND s.status IN ('active','pending')
 ORDER BY CASE WHEN s.status='active' THEN 0 ELSE 1 END,s.created_at LIMIT 1;
 IF FOUND THEN
  RETURN jsonb_build_object('status','duplicate','code',c.registration_code,
   'message','Họ tên này đã có trong danh sách lớp '||c.class_name||'. Không tạo hồ sơ thứ hai. Nếu có hai bạn trùng tên thật, nhờ giáo viên kiểm tra và thêm thủ công.');
 END IF;
 IF EXISTS(SELECT 1 FROM public.student_registrations r
  WHERE r.registration_code=c.registration_code AND r.status IN ('pending','approved')
    AND lower(regexp_replace(trim(r.full_name),'\s+',' ','g'))=lower(clean_name)) THEN
  RETURN jsonb_build_object('status','duplicate','code',c.registration_code,
   'message','Bạn đã đăng ký tên này cho lớp '||c.class_name||'. Không cần gửi thêm; nhờ giáo viên kiểm tra nếu có hai bạn trùng tên thật.');
 END IF;
 IF c.auto_approve THEN
  INSERT INTO public.students(school_id,class_id,class_name,school_name,
    full_name,student_code,gender,status,created_by)
  VALUES(c.school_id,c.id,c.class_name,(SELECT name FROM public.schools WHERE id=c.school_id),
    applicant_name,NULL,valid_gender,'active',c.created_by)
  RETURNING * INTO student;
  IF pc.id IS NOT NULL AND pc.status NOT IN ('broken','maintenance') THEN
    SELECT count(*) INTO seats
    FROM public.computer_assignments a JOIN public.students s ON s.id=a.student_id
    WHERE a.computer_id=pc.id AND a.active AND s.school_id=c.school_id
      AND (s.class_id=c.id OR (s.class_id IS NULL AND s.class_name=c.class_name));
    IF seats<pc.capacity THEN
      INSERT INTO public.computer_assignments(school_id,computer_id,student_id,active)
      VALUES(c.school_id,pc.id,student.id,true);
      response:='Đăng ký đã được duyệt tự động và xếp vào máy '||clean_pc||'.';
    ELSE response:='Đăng ký đã được duyệt nhưng máy mong muốn đang đầy hoặc không dùng được. Giáo viên sẽ xếp máy khác.'; END IF;
  ELSE response:='Đăng ký đã được duyệt tự động. Giáo viên sẽ xếp máy cho bạn.'; END IF;
  INSERT INTO public.student_registrations(registration_code,full_name,gender,
    computer_code,note,status,review_note)
  VALUES(c.registration_code,applicant_name,valid_gender,clean_pc,left(coalesce(p_note,''),500),
    'approved','Đã duyệt tự động khi đăng ký') RETURNING * INTO request;
  RETURN jsonb_build_object('status','approved','code',c.registration_code,'message',response);
 END IF;
 INSERT INTO public.student_registrations(registration_code,full_name,gender,computer_code,note,status)
 VALUES(c.registration_code,applicant_name,valid_gender,clean_pc,left(coalesce(p_note,''),500),'pending')
 RETURNING * INTO request;
 RETURN jsonb_build_object('status','pending','code',c.registration_code,
   'message','Đã gửi đăng ký đến giáo viên. Hãy chờ duyệt hồ sơ.');
END;
$fn$;

CREATE OR REPLACE FUNCTION public.approve_registration(registration_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE r public.student_registrations%ROWTYPE; c public.classes%ROWTYPE;
 pc public.computers%ROWTYPE; existing public.students%ROWTYPE; sid uuid;
 pc_code text; seats integer;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active
     AND role IN ('admin','teacher','staff')) THEN RAISE EXCEPTION 'Chưa có quyền duyệt'; END IF;
 SELECT * INTO r FROM public.student_registrations WHERE id=registration_id FOR UPDATE;
 IF NOT FOUND OR r.status<>'pending' THEN RAISE EXCEPTION 'Đăng ký không còn chờ duyệt'; END IF;
 SELECT * INTO c FROM public.classes WHERE registration_code=r.registration_code AND archived_at IS NULL;
 IF NOT FOUND OR NOT public.can_access_school(c.school_id) THEN RAISE EXCEPTION 'Không có quyền duyệt lớp này'; END IF;
 IF c.created_by IS DISTINCT FROM auth.uid() AND NOT public.is_admin()
 THEN RAISE EXCEPTION 'Chỉ chủ lớp hoặc Admin mới được duyệt'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(c.id::text||':'||lower(trim(r.full_name)),0));
 SELECT * INTO existing FROM public.students s
 WHERE s.school_id=c.school_id AND (s.class_id=c.id OR (s.class_id IS NULL AND s.class_name=c.class_name))
   AND lower(regexp_replace(trim(s.full_name),'\s+',' ','g'))=
       lower(regexp_replace(trim(r.full_name),'\s+',' ','g'))
   AND s.status IN ('active','pending') ORDER BY s.created_at LIMIT 1;
 IF FOUND THEN
  UPDATE public.student_registrations SET status='approved',
    review_note='Hồ sơ đã có trong lớp, không tạo bản trùng' WHERE id=r.id;
  RETURN existing.id;
 END IF;
 pc_code:=public.ic3_normalize_pc(r.computer_code);
 IF pc_code IS NOT NULL THEN
  SELECT * INTO pc FROM public.computers WHERE school_id=c.school_id AND computer_code=pc_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy máy đăng ký'; END IF;
  IF pc.status IN ('broken','maintenance') THEN RAISE EXCEPTION 'Máy đang hỏng hoặc bảo trì'; END IF;
  SELECT count(*) INTO seats FROM public.computer_assignments a
    JOIN public.students s ON s.id=a.student_id
   WHERE a.computer_id=pc.id AND a.active AND s.school_id=c.school_id
     AND (s.class_id=c.id OR (s.class_id IS NULL AND s.class_name=c.class_name));
  IF seats>=pc.capacity THEN RAISE EXCEPTION 'Máy đã đủ chỗ, hãy đổi máy trước khi duyệt'; END IF;
 END IF;
 INSERT INTO public.students(school_id,class_id,class_name,school_name,full_name,gender,status,created_by)
 VALUES(c.school_id,c.id,c.class_name,(SELECT name FROM public.schools WHERE id=c.school_id),
        r.full_name,r.gender,'active',auth.uid()) RETURNING id INTO sid;
 IF pc.id IS NOT NULL THEN
  INSERT INTO public.computer_assignments(school_id,computer_id,student_id,active)
  VALUES(c.school_id,pc.id,sid,true);
 END IF;
 UPDATE public.student_registrations SET status='approved',review_note='Duyệt thủ công' WHERE id=r.id;
 RETURN sid;
END;
$fn$;
