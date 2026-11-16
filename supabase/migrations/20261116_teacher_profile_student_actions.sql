
-- IC3 GS6 personal settings and explicit destructive delete actions.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_data text;
ALTER TABLE public.profiles ADD CONSTRAINT ic3_profile_avatar_max
 CHECK (avatar_data IS NULL OR (length(avatar_data)<=170000 AND avatar_data ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'));
CREATE OR REPLACE FUNCTION public.ic3_update_own_profile(p_name text,p_avatar_data text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE cleaned text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff() THEN RAISE EXCEPTION 'Chưa đăng nhập hoặc chưa có quyền'; END IF;
 cleaned:=trim(regexp_replace(coalesce(p_name,''),'\s+',' ','g'));
 IF length(cleaned) NOT BETWEEN 3 AND 100 OR cleaned !~ '^[[:alpha:] ]+$' THEN
  RAISE EXCEPTION 'Họ tên phải từ 3 đến 100 ký tự và chỉ có chữ cái';
 END IF;
 IF p_avatar_data IS NOT NULL AND (length(p_avatar_data)>170000 OR
   p_avatar_data !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$') THEN
    RAISE EXCEPTION 'Ảnh đại diện không đúng định dạng hoặc quá lớn';
 END IF;
 UPDATE public.profiles SET full_name=cleaned,avatar_data=p_avatar_data WHERE id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy hồ sơ cá nhân'; END IF;
 RETURN true;
END;
$fn$;
REVOKE ALL ON FUNCTION public.ic3_update_own_profile(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ic3_update_own_profile(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.ic3_permanent_delete_flagged_student(p_student_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE st public.students%ROWTYPE; cl public.classes%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff() THEN RAISE EXCEPTION 'Cần đăng nhập giáo viên'; END IF;
 SELECT * INTO st FROM public.students WHERE id=p_student_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Hồ sơ không tồn tại'; END IF;
 IF st.name_review_status='allow' THEN RAISE EXCEPTION 'Học sinh không bị đánh dấu, không thể xóa qua chức năng rà soát'; END IF;
 IF NOT public.can_access_school(st.school_id) THEN RAISE EXCEPTION 'Bạn không thuộc trường này'; END IF;
 IF NOT public.is_admin() THEN
  SELECT * INTO cl FROM public.classes WHERE id=st.class_id;
  IF st.created_by IS DISTINCT FROM auth.uid()
   AND (cl.id IS NULL OR cl.created_by IS DISTINCT FROM auth.uid()) THEN
   RAISE EXCEPTION 'Không được xóa hồ sơ của giáo viên khác';
  END IF;
 END IF;
 DELETE FROM public.students WHERE id=st.id;
 -- Eight dependent tables with student_id cascade by FK;
 -- registration is not FK-linked, so remove matching applications owned by the class only.
 IF cl.id IS NOT NULL THEN
  DELETE FROM public.student_registrations r
   WHERE r.registration_code=cl.registration_code AND r.full_name=st.full_name;
 END IF;
 RETURN true;
END;
$fn$;
REVOKE ALL ON FUNCTION public.ic3_permanent_delete_flagged_student(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ic3_permanent_delete_flagged_student(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ic3_delete_rejected_registration(p_registration_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE reg public.student_registrations%ROWTYPE; cl public.classes%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff() THEN RAISE EXCEPTION 'Cần đăng nhập giáo viên'; END IF;
 SELECT * INTO reg FROM public.student_registrations WHERE id=p_registration_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Đăng ký không tồn tại'; END IF;
 IF reg.status<>'pending' THEN RAISE EXCEPTION 'Chỉ xóa được yêu cầu chưa duyệt'; END IF;
 SELECT * INTO cl FROM public.classes WHERE registration_code=reg.registration_code;
 IF NOT FOUND OR NOT public.can_access_school(cl.school_id) OR
  (NOT public.is_admin() AND cl.created_by IS DISTINCT FROM auth.uid())
 THEN RAISE EXCEPTION 'Bạn không quản lý lớp này'; END IF;
 DELETE FROM public.student_registrations WHERE id=reg.id;
 RETURN true;
END;
$fn$;
REVOKE ALL ON FUNCTION public.ic3_delete_rejected_registration(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ic3_delete_rejected_registration(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ic3_update_student_name(p_student_id uuid,p_new_name text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE st public.students%ROWTYPE; cl public.classes%ROWTYPE; cleaned text; review jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff() THEN RAISE EXCEPTION 'Cần đăng nhập giáo viên'; END IF;
 SELECT * INTO st FROM public.students WHERE id=p_student_id FOR UPDATE;
 IF NOT FOUND OR NOT public.can_access_school(st.school_id) THEN RAISE EXCEPTION 'Không tìm thấy học sinh hoặc không có quyền'; END IF;
 SELECT * INTO cl FROM public.classes WHERE id=st.class_id;
 IF NOT public.is_admin() AND st.created_by IS DISTINCT FROM auth.uid()
    AND (cl.id IS NULL OR cl.created_by IS DISTINCT FROM auth.uid())
 THEN RAISE EXCEPTION 'Không có quyền sửa học sinh của giáo viên khác'; END IF;
 cleaned:=trim(regexp_replace(coalesce(p_new_name,''),'\s+',' ','g'));
 review:=public.ic3_name_review(cleaned);
 IF review->>'decision'='reject' THEN RAISE EXCEPTION '%',review->>'reason'; END IF;
 IF EXISTS (SELECT 1 FROM public.students x WHERE x.id<>st.id AND x.school_id=st.school_id
  AND (x.class_id=st.class_id OR (x.class_id IS NULL AND x.class_name=st.class_name))
  AND lower(trim(x.full_name))=lower(cleaned) AND x.status='active') THEN
  RAISE EXCEPTION 'Lớp đã có học sinh cùng họ tên, vui lòng kiểm tra'; END IF;
 UPDATE public.students SET full_name=cleaned WHERE id=st.id;
 RETURN true;
END;
$fn$;
REVOKE ALL ON FUNCTION public.ic3_update_student_name(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ic3_update_student_name(uuid,text) TO authenticated;
