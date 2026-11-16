
CREATE OR REPLACE FUNCTION public.ic3_admin_import_teacher_timetable(
 p_school_id uuid,p_teacher_id uuid,p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE r jsonb; target_name text; school_name text; class_id uuid;
 d date; st time; et time; periods integer; created integer:=0; skipped integer:=0;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN
  RAISE EXCEPTION 'Chỉ Admin mới được nhập lịch cho giáo viên khác';
 END IF;
 IF NOT public.can_access_school(p_school_id) THEN RAISE EXCEPTION 'Không có quyền quản lý trường này'; END IF;
 SELECT name INTO school_name FROM public.schools WHERE id=p_school_id;
 IF school_name IS NULL THEN RAISE EXCEPTION 'Trường không tồn tại'; END IF;
 SELECT full_name INTO target_name FROM public.profiles
 WHERE id=p_teacher_id AND role IN ('admin','teacher','staff') AND is_active=true;
 IF target_name IS NULL THEN RAISE EXCEPTION 'Giáo viên chưa có tài khoản hoặc đã bị khóa'; END IF;
 IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 300
 THEN RAISE EXCEPTION 'Chỉ nhập từ 1 đến 300 buổi mỗi lần'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_teacher_id::text,0));
 FOR r IN SELECT value FROM jsonb_array_elements(p_items) LOOP
   IF length(trim(coalesce(r->>'class_name',''))) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Tên lớp không hợp lệ'; END IF;
   IF trim(coalesce(r->>'school_name',''))<>school_name THEN
    RAISE EXCEPTION 'Bản nháp chứa trường khác. Hãy chỉ nhập lịch thuộc %',school_name; END IF;
   d:=nullif(r->>'session_date','')::date;
   st:=nullif(r->>'start_time','')::time;
   et:=nullif(r->>'end_time','')::time;
   periods:=coalesce(nullif(r->>'period_count','')::integer,1);
   IF d IS NULL OR st IS NULL OR et IS NULL OR et<=st OR periods NOT BETWEEN 1 AND 20
   THEN RAISE EXCEPTION 'Ngày, giờ hoặc số tiết không hợp lệ'; END IF;
   IF EXISTS(SELECT 1 FROM public.class_sessions s
      WHERE s.teacher_id=p_teacher_id AND s.school_id=p_school_id
       AND s.class_name=trim(r->>'class_name') AND s.session_date=d
       AND s.start_time=st AND s.end_time=et)
   THEN skipped:=skipped+1;CONTINUE;END IF;
   IF EXISTS(SELECT 1 FROM public.class_sessions s
      WHERE s.teacher_id=p_teacher_id AND s.session_date=d
        AND s.start_time<et AND s.end_time>st)
   THEN RAISE EXCEPTION 'Trùng giờ dạy của % vào ngày % lúc %',target_name,d,st;END IF;
   SELECT c.id INTO class_id FROM public.classes c
   WHERE c.school_id=p_school_id AND c.class_name=trim(r->>'class_name')
    AND c.created_by=p_teacher_id AND c.archived_at IS NULL
   ORDER BY c.created_at LIMIT 1;
   INSERT INTO public.class_sessions(
      school_id,class_id,class_name,session_date,start_time,end_time,
      teacher_id,teacher_name,period_count,created_by)
   VALUES(p_school_id,class_id,trim(r->>'class_name'),d,st,et,
      p_teacher_id,target_name,periods,auth.uid());
   created:=created+1;
 END LOOP;
 RETURN jsonb_build_object('created',created,'skipped',skipped,'teacher_name',target_name);
END; $fn$;
REVOKE ALL ON FUNCTION public.ic3_admin_import_teacher_timetable(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ic3_admin_import_teacher_timetable(uuid,uuid,jsonb) TO authenticated;
