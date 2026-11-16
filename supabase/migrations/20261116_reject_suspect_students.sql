
CREATE OR REPLACE FUNCTION public.ic3_reject_suspect_student(p_student_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE s public.students%ROWTYPE; c public.classes%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Cần đăng nhập'; END IF;
 SELECT * INTO s FROM public.students WHERE id=p_student_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy học sinh'; END IF;
 IF s.name_review_status='allow' THEN RAISE EXCEPTION 'Tên này không bị cảnh báo, dùng quy trình quản lý hồ sơ thông thường'; END IF;
 IF NOT public.can_access_school(s.school_id) THEN RAISE EXCEPTION 'Không có quyền trường này'; END IF;
 IF NOT public.is_admin() THEN
  SELECT * INTO c FROM public.classes WHERE id=s.class_id;
  IF NOT FOUND OR c.created_by IS DISTINCT FROM auth.uid()
  THEN RAISE EXCEPTION 'Chỉ giáo viên tạo lớp hoặc Admin được rà soát'; END IF;
 END IF;
 UPDATE public.students SET status='rejected' WHERE id=s.id;
 UPDATE public.computer_assignments SET active=false,released_at=now()
 WHERE student_id=s.id AND active;
 RETURN true;
END;
$fn$;
REVOKE ALL ON FUNCTION public.ic3_reject_suspect_student(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ic3_reject_suspect_student(uuid) TO authenticated;
