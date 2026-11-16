-- Preserve old /student class links after shortening UUID registration codes.
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
      AND r.school_id=v_class.school_id AND r.record_type='violation'),0),
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

CREATE OR REPLACE FUNCTION public.get_student_class_portal(p_code text, p_secret text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_class public.classes%ROWTYPE; v_student public.students%ROWTYPE;
 v_seats jsonb;v_detail jsonb;v_scores jsonb;v_records jsonb;v_attendance jsonb;v_schedule jsonb;
 v_secret text:=regexp_replace(upper(coalesce(p_secret,'')),'[^A-Z0-9]','','g');
BEGIN
 IF p_code IS NULL OR length(p_code) NOT BETWEEN 4 AND 120 THEN RAISE EXCEPTION 'Mã lớp không hợp lệ'; END IF;
 SELECT * INTO v_class FROM public.classes WHERE (registration_code=upper(trim(p_code)) OR upper(trim(p_code))=ANY(legacy_registration_codes)) AND archived_at IS NULL ORDER BY CASE WHEN registration_code=upper(trim(p_code)) THEN 0 ELSE 1 END LIMIT 1;
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
END; $function$
;
