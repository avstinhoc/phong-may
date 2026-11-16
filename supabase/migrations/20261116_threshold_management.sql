CREATE OR REPLACE FUNCTION public.set_school_violation_threshold(p_school_id uuid,p_threshold integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
 IF p_threshold NOT IN (3,4) THEN RAISE EXCEPTION 'Ngưỡng phải là 3 hoặc 4 lần'; END IF;
 IF auth.uid() IS NULL OR NOT EXISTS
  (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active=true AND role IN ('admin','teacher','staff'))
  OR NOT public.can_access_school(p_school_id)
 THEN RAISE EXCEPTION 'Bạn không có quyền chỉnh ngưỡng của trường này'; END IF;
 UPDATE public.schools SET violation_report_threshold=p_threshold WHERE id=p_school_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy trường'; END IF;
 RETURN p_threshold;
END;
$fn$;
REVOKE ALL ON FUNCTION public.set_school_violation_threshold(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_school_violation_threshold(uuid,integer) TO authenticated;