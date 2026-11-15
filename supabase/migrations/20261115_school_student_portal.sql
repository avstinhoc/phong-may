-- School administration and protected student portal (no destructive data changes during migration).
CREATE TABLE IF NOT EXISTS public.student_portal_tokens (
  student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_portal_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_portal_tokens FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rename_my_school(p_school_id uuid,p_new_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_name text := trim(p_new_name);
BEGIN
 IF NOT public.is_admin() OR NOT public.can_access_school(p_school_id) THEN
   RAISE EXCEPTION 'Chỉ Admin được đổi tên trường';
 END IF;
 IF length(v_name) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Tên trường không hợp lệ'; END IF;
 UPDATE public.schools SET name=v_name WHERE id=p_school_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy trường'; END IF;
 UPDATE public.students SET school_name=v_name WHERE school_id=p_school_id;
 UPDATE public.profiles SET school_name=v_name WHERE school_id=p_school_id;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_my_school(p_school_id uuid,p_confirmation text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_school public.schools%ROWTYPE;
BEGIN
 IF NOT public.is_admin() OR NOT public.can_access_school(p_school_id) THEN
   RAISE EXCEPTION 'Chỉ Admin được xóa trường';
 END IF;
 SELECT * INTO v_school FROM public.schools WHERE id=p_school_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy trường'; END IF;
 IF p_confirmation IS DISTINCT FROM v_school.name THEN
   RAISE EXCEPTION 'Bạn phải nhập chính xác tên trường để xác nhận';
 END IF;
 -- These two FKs intentionally block cascaded school deletion; clear their dependent rows first.
 DELETE FROM public.student_results WHERE school_id=p_school_id;
 DELETE FROM public.student_registrations WHERE registration_code IN
  (SELECT registration_code FROM public.classes WHERE school_id=p_school_id);
 DELETE FROM public.schools WHERE id=p_school_id;
END; $$;

CREATE OR REPLACE FUNCTION public.issue_student_portal_token(p_student_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_school uuid; v_token text;
BEGIN
 SELECT school_id INTO v_school FROM public.students WHERE id=p_student_id;
 IF v_school IS NULL OR NOT public.can_access_school(v_school) THEN
   RAISE EXCEPTION 'Không có quyền cấp mã xem kết quả học sinh';
 END IF;
 v_token := encode(extensions.gen_random_bytes(24),'hex');
 INSERT INTO public.student_portal_tokens(student_id,token_hash,issued_at)
 VALUES (p_student_id,encode(extensions.digest(v_token,'sha256'),'hex'),now())
 ON CONFLICT(student_id) DO UPDATE SET token_hash=excluded.token_hash,issued_at=now();
 RETURN v_token;
END; $$;

CREATE OR REPLACE FUNCTION public.get_student_class_portal(p_code text,p_secret text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_class public.classes%ROWTYPE; v_student public.students%ROWTYPE;
  v_seats jsonb;v_detail jsonb;v_scores jsonb;v_records jsonb;v_attendance jsonb;v_schedule jsonb;
BEGIN
 IF p_code IS NULL OR length(p_code) NOT BETWEEN 4 AND 120 THEN
   RAISE EXCEPTION 'Mã lớp không hợp lệ';
 END IF;
 SELECT * INTO v_class FROM public.classes WHERE registration_code=upper(trim(p_code));
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy mã lớp. Kiểm tra mã giáo viên đã cấp'; END IF;
 -- Only a strong individual token may unlock student names and private results.
 IF p_secret IS NOT NULL AND length(p_secret)=48 AND p_secret ~ '^[a-f0-9]{48}$' THEN
 SELECT s.* INTO v_student
 FROM public.students s JOIN public.student_portal_tokens t ON t.student_id=s.id
 WHERE s.school_id=v_class.school_id
 AND (s.class_id=v_class.id OR (s.class_id IS NULL AND s.class_name=v_class.class_name))
 AND t.token_hash=encode(extensions.digest(p_secret,'sha256'),'hex')
 LIMIT 1;
 END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'computer',c.computer_code,'status',c.status,'capacity',c.capacity,
  'occupied',(SELECT count(*) FROM public.computer_assignments a
    JOIN public.students s ON s.id=a.student_id
    WHERE a.computer_id=c.id AND a.active
    AND (s.class_id=v_class.id OR (s.class_id IS NULL AND s.class_name=v_class.class_name))),
  'students',CASE WHEN v_student.id IS NOT NULL THEN
   (SELECT COALESCE(jsonb_agg(s.full_name ORDER BY s.full_name),'[]'::jsonb)
    FROM public.computer_assignments a JOIN public.students s ON s.id=a.student_id
    WHERE a.computer_id=c.id AND a.active
    AND (s.class_id=v_class.id OR (s.class_id IS NULL AND s.class_name=v_class.class_name)))
   ELSE '[]'::jsonb END
 ) ORDER BY NULLIF(regexp_replace(c.computer_code,'[^0-9]','','g'),'')::int NULLS LAST,c.computer_code),'[]'::jsonb)
 INTO v_seats FROM public.computers c WHERE c.school_id=v_class.school_id;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('date',s.session_date,'start',s.start_time,'end',s.end_time,'periods',s.period_count)
  ORDER BY s.session_date,s.start_time),'[]'::jsonb) INTO v_schedule
 FROM public.class_sessions s WHERE s.school_id=v_class.school_id
 AND (s.class_id=v_class.id OR (s.class_id IS NULL AND s.class_name=v_class.class_name))
 AND s.session_date>=current_date - 14;
 IF v_student.id IS NOT NULL THEN
 SELECT COALESCE(jsonb_agg(jsonb_build_object('type',r.record_type,'title',r.title,'points',r.points,'date',r.record_date)
 ORDER BY r.record_date DESC),'[]'::jsonb) INTO v_records FROM public.student_records r WHERE r.student_id=v_student.id;
 SELECT to_jsonb(r) - 'id' - 'school_id' - 'student_id' - 'updated_at' INTO v_scores
 FROM public.student_results r WHERE r.student_id=v_student.id;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('status',a.status,'session_date',s.session_date)
 ORDER BY s.session_date DESC),'[]'::jsonb) INTO v_attendance
 FROM public.attendance a JOIN public.class_sessions s ON s.id=a.session_id WHERE a.student_id=v_student.id;
 v_detail:=jsonb_build_object('name',v_student.full_name,'student_code',v_student.student_code,
 'scores',COALESCE(v_scores,'{}'::jsonb),'records',v_records,'attendance',v_attendance);
 END IF;
 RETURN jsonb_build_object('school',(SELECT name FROM public.schools WHERE id=v_class.school_id),
 'class_name',v_class.class_name,'computers',v_seats,'schedule',v_schedule,'student',v_detail);
END; $$;
REVOKE ALL ON FUNCTION public.rename_my_school(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_school(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_student_portal_token(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_student_class_portal(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rename_my_school(uuid,text),public.delete_my_school(uuid,text),
 public.issue_student_portal_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_class_portal(text,text) TO anon,authenticated;
