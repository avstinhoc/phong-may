-- Teacher/Admin confirmation for an already approved student whose real name
-- was flagged for manual verification. Does not remove students, scores, or PC assignments.
CREATE OR REPLACE FUNCTION public.ic3_confirm_student_name_review(p_student_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
 st public.students%ROWTYPE;
 cl public.classes%ROWTYPE;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.is_staff() THEN
  RAISE EXCEPTION 'Bạn cần đăng nhập giáo viên để xác minh tên';
 END IF;
 SELECT * INTO st FROM public.students WHERE id=p_student_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy học sinh'; END IF;
 IF st.status<>'active' THEN RAISE EXCEPTION 'Chỉ xác minh hồ sơ đang học'; END IF;
 IF st.name_review_status IS NULL OR st.name_review_status='allow' THEN
  RAISE EXCEPTION 'Tên học sinh đã được xác minh hoặc không còn cần rà soát';
 END IF;
 IF NOT public.can_access_school(st.school_id) THEN
  RAISE EXCEPTION 'Bạn không có quyền với trường này';
 END IF;
 SELECT * INTO cl FROM public.classes WHERE id=st.class_id;
 IF NOT public.is_admin() AND st.created_by IS DISTINCT FROM (SELECT auth.uid())
   AND (cl.id IS NULL OR cl.created_by IS DISTINCT FROM (SELECT auth.uid())) THEN
  RAISE EXCEPTION 'Chỉ giáo viên phụ trách lớp hoặc Admin được xác minh';
 END IF;
 IF (public.ic3_name_review(st.full_name)->>'decision')='reject' THEN
  RAISE EXCEPTION 'Tên không hợp lệ; hãy sửa đúng họ tên thay vì duyệt';
 END IF;
 UPDATE public.students
 SET name_review_status='allow', name_review_reason='Đã được giáo viên xác minh thủ công'
 WHERE id=p_student_id;
 RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.ic3_confirm_student_name_review(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ic3_confirm_student_name_review(uuid) TO authenticated;