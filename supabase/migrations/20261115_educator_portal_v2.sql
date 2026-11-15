
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS logo_data text;

CREATE OR REPLACE FUNCTION public.update_my_school_logo(p_school_id uuid,p_logo_data text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE picture bytea;
BEGIN
 IF NOT public.is_admin() OR NOT public.can_access_school(p_school_id) THEN RAISE EXCEPTION 'Chỉ Admin được thay logo'; END IF;
 IF p_logo_data IS NOT NULL THEN
  IF length(p_logo_data)>220000 OR p_logo_data NOT LIKE 'data:image/png;base64,%' THEN RAISE EXCEPTION 'Logo phải là ảnh PNG tối đa 160 KB'; END IF;
  BEGIN picture:=decode(split_part(p_logo_data,',',2),'base64'); EXCEPTION WHEN others THEN RAISE EXCEPTION 'Dữ liệu logo không hợp lệ'; END;
  IF octet_length(picture)>160000 OR encode(substring(picture from 1 for 8),'hex')<>'89504e470d0a1a0a'
   THEN RAISE EXCEPTION 'Ảnh PNG không hợp lệ hoặc quá lớn'; END IF;
 END IF;
 UPDATE public.schools SET logo_data=p_logo_data WHERE id=p_school_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Trường không tồn tại'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.update_my_school_logo(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_school_logo(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_student_portal_token(p_student_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_school uuid; raw bytea; token text:=''; abc text:='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i integer;
BEGIN
 SELECT school_id INTO v_school FROM public.students WHERE id=p_student_id;
 IF v_school IS NULL OR NOT public.can_access_school(v_school) THEN RAISE EXCEPTION 'Không có quyền cấp mã cho học sinh'; END IF;
 raw:=extensions.gen_random_bytes(12);
 FOR i IN 0..11 LOOP token:=token||substr(abc,(get_byte(raw,i)%32)+1,1); END LOOP;
 INSERT INTO public.student_portal_tokens(student_id,token_hash,issued_at)
 VALUES(p_student_id,encode(extensions.digest(token,'sha256'),'hex'),now())
 ON CONFLICT(student_id) DO UPDATE SET token_hash=excluded.token_hash,issued_at=now();
 RETURN substr(token,1,4)||'-'||substr(token,5,4)||'-'||substr(token,9,4);
END; $$;
REVOKE ALL ON FUNCTION public.issue_student_portal_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_student_portal_token(uuid) TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_session_student_uq ON public.attendance(session_id,student_id);

CREATE OR REPLACE FUNCTION public.save_roll_call(target_session uuid,entries jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE lesson public.class_sessions; item jsonb; sid uuid; state text; n integer:=0;
BEGIN
 SELECT * INTO lesson FROM public.class_sessions WHERE id=target_session FOR UPDATE;
 IF NOT FOUND OR NOT public.can_access_school(lesson.school_id) THEN RAISE EXCEPTION 'Không có quyền điểm danh'; END IF;
 IF jsonb_typeof(entries)<>'array' OR jsonb_array_length(entries)>500 THEN RAISE EXCEPTION 'Danh sách điểm danh không hợp lệ'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(entries) LOOP
  sid:=(item->>'student_id')::uuid;state:=item->>'status';
  IF state IS NULL OR state NOT IN ('present','absent','late','excused') THEN RAISE EXCEPTION 'Trạng thái không hợp lệ'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.students s WHERE s.id=sid AND s.school_id=lesson.school_id AND s.status='active'
   AND ((lesson.class_id IS NOT NULL AND s.class_id=lesson.class_id)
   OR ((lesson.class_id IS NULL OR s.class_id IS NULL) AND s.class_name=lesson.class_name)))
   THEN RAISE EXCEPTION 'Học sinh không thuộc buổi học'; END IF;
  INSERT INTO public.attendance(school_id,session_id,student_id,status,note)
  VALUES(lesson.school_id,target_session,sid,state,left(coalesce(item->>'note',''),1000))
  ON CONFLICT(session_id,student_id) DO UPDATE SET status=EXCLUDED.status,note=EXCLUDED.note;
  n:=n+1;
 END LOOP;
 RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.save_roll_call(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_roll_call(uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_student_class_portal(p_code text,p_secret text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_class public.classes%ROWTYPE; v_student public.students%ROWTYPE;
 v_seats jsonb;v_detail jsonb;v_scores jsonb;v_records jsonb;v_attendance jsonb;v_schedule jsonb;
 v_secret text:=regexp_replace(upper(coalesce(p_secret,'')),'[^A-Z0-9]','','g');
BEGIN
 IF p_code IS NULL OR length(p_code) NOT BETWEEN 4 AND 120 THEN RAISE EXCEPTION 'Mã lớp không hợp lệ'; END IF;
 SELECT * INTO v_class FROM public.classes WHERE registration_code=upper(trim(p_code));
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy mã lớp'; END IF;
 IF (length(v_secret)=12 AND v_secret ~ '^[A-HJ-NP-Z2-9]{12}$') OR
    (length(v_secret)=48 AND v_secret ~ '^[A-F0-9]{48}$') THEN
  SELECT s.* INTO v_student FROM public.students s
  JOIN public.student_portal_tokens t ON t.student_id=s.id
  WHERE s.school_id=v_class.school_id
   AND (s.class_id=v_class.id OR (s.class_id IS NULL AND s.class_name=v_class.class_name))
   AND t.token_hash=encode(extensions.digest(CASE WHEN length(v_secret)=48 THEN lower(v_secret) ELSE v_secret END,'sha256'),'hex')
   LIMIT 1;
 END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'computer',c.computer_code,'status',c.status,'capacity',c.capacity,
  'occupied',(SELECT count(*) FROM public.computer_assignments a
    JOIN public.students s ON s.id=a.student_id WHERE a.computer_id=c.id AND a.active
    AND (s.class_id=v_class.id OR (s.class_id IS NULL AND s.class_name=v_class.class_name))),
  'students',(SELECT COALESCE(jsonb_agg(regexp_replace(trim(s.full_name),
    '^.*[[:space:]]([^[:space:]]+[[:space:]]+[^[:space:]]+)$','\1') ORDER BY s.full_name),'[]'::jsonb)
    FROM public.computer_assignments a JOIN public.students s ON s.id=a.student_id
    WHERE a.computer_id=c.id AND a.active AND s.status='active'
    AND (s.class_id=v_class.id OR (s.class_id IS NULL AND s.class_name=v_class.class_name))),
  'cleaning',(SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date',x.cleaning_date,'status',x.status,'student',x.short_name) ORDER BY x.cleaning_date DESC),'[]'::jsonb)
    FROM (SELECT l.cleaning_date,l.status,regexp_replace(trim(s.full_name),
    '^.*[[:space:]]([^[:space:]]+[[:space:]]+[^[:space:]]+)$','\1') AS short_name
    FROM public.cleaning_logs l JOIN public.students s ON s.id=l.student_id
    WHERE l.school_id=v_class.school_id AND l.computer_id=c.id
     AND (s.class_id=v_class.id OR (s.class_id IS NULL AND s.class_name=v_class.class_name))
     AND EXISTS(SELECT 1 FROM public.computer_assignments a
       WHERE a.computer_id=c.id AND a.student_id=s.id AND a.active)
    ORDER BY l.cleaning_date DESC LIMIT 5) x)
 ) ORDER BY NULLIF(regexp_replace(c.computer_code,'[^0-9]','','g'),'')::int NULLS LAST,c.computer_code),'[]'::jsonb)
 INTO v_seats FROM public.computers c WHERE c.school_id=v_class.school_id;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('date',s.session_date,'start',s.start_time,'end',s.end_time,'periods',s.period_count)
 ORDER BY s.session_date,s.start_time),'[]'::jsonb) INTO v_schedule FROM public.class_sessions s
 WHERE s.school_id=v_class.school_id
  AND (s.class_id=v_class.id OR (s.class_id IS NULL AND s.class_name=v_class.class_name))
  AND s.session_date>=current_date-14;
 IF v_student.id IS NOT NULL THEN
  SELECT COALESCE(jsonb_agg(jsonb_build_object('type',r.record_type,'title',r.title,
    'points',r.points,'date',r.record_date) ORDER BY r.record_date DESC),'[]'::jsonb)
    INTO v_records FROM public.student_records r WHERE r.student_id=v_student.id;
  SELECT to_jsonb(r)-'id'-'school_id'-'student_id'-'updated_at' INTO v_scores
    FROM public.student_results r WHERE r.student_id=v_student.id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('status',a.status,'session_date',s.session_date)
    ORDER BY s.session_date DESC),'[]'::jsonb) INTO v_attendance
    FROM public.attendance a JOIN public.class_sessions s ON s.id=a.session_id
    WHERE a.student_id=v_student.id;
  v_detail:=jsonb_build_object('name',v_student.full_name,'student_code',v_student.student_code,
     'scores',COALESCE(v_scores,'{}'::jsonb),'records',v_records,'attendance',v_attendance);
 END IF;
 RETURN jsonb_build_object('school',(SELECT name FROM public.schools WHERE id=v_class.school_id),
 'logo',(SELECT logo_data FROM public.schools WHERE id=v_class.school_id),
 'class_name',v_class.class_name,'computers',v_seats,'schedule',v_schedule,'student',v_detail);
END; $$;
REVOKE ALL ON FUNCTION public.get_student_class_portal(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_class_portal(text,text) TO anon,authenticated;
