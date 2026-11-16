
CREATE OR REPLACE FUNCTION public.ic3_replace_own_timetable(
 p_school_id uuid,p_start_date date,p_end_date date,p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE school_name text; row jsonb; deleted_count integer; result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff() THEN RAISE EXCEPTION 'Bạn cần đăng nhập bằng tài khoản giáo viên'; END IF;
 IF p_start_date IS NULL OR p_end_date IS NULL OR p_start_date>p_end_date OR p_end_date-p_start_date>90
 THEN RAISE EXCEPTION 'Khoảng ngày thay lịch không hợp lệ (tối đa 91 ngày)'; END IF;
 IF NOT public.can_access_school(p_school_id) THEN RAISE EXCEPTION 'Bạn chưa được phép quản lý trường này'; END IF;
 SELECT name INTO school_name FROM public.schools WHERE id=p_school_id;
 IF school_name IS NULL THEN RAISE EXCEPTION 'Không tìm thấy trường'; END IF;
 IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 300
 THEN RAISE EXCEPTION 'Bản lịch thay thế cần từ 1 đến 300 buổi đã xác minh'; END IF;
 FOR row IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  IF trim(coalesce(row->>'school_name','')) IS DISTINCT FROM school_name
   OR (row->>'session_date')::date NOT BETWEEN p_start_date AND p_end_date
  THEN RAISE EXCEPTION 'Lịch thay thế chứa trường/ngày ngoài phạm vi được chọn'; END IF;
 END LOOP;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 DELETE FROM public.class_sessions s
 WHERE s.school_id=p_school_id AND s.session_date BETWEEN p_start_date AND p_end_date
  AND (s.teacher_id=auth.uid() OR (s.teacher_id IS NULL AND s.created_by=auth.uid()));
 GET DIAGNOSTICS deleted_count=ROW_COUNT;
 result:=public.import_timetable(p_items);
 RETURN jsonb_build_object('deleted',deleted_count,'created',COALESCE((result->>'created')::int,0),
   'skipped',COALESCE((result->>'skipped')::int,0));
END;
$fn$;
REVOKE ALL ON FUNCTION public.ic3_replace_own_timetable(uuid,date,date,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ic3_replace_own_timetable(uuid,date,date,jsonb) TO authenticated;
