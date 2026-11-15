-- Permit active teachers and staff to manage schools they belong to.
-- Never allow operations on schools outside school_members/can_access_school.
CREATE OR REPLACE FUNCTION public.rename_my_school(p_school_id uuid,p_new_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_name text := trim(p_new_name);
BEGIN
 IF NOT public.is_staff() OR NOT public.can_access_school(p_school_id) THEN
   RAISE EXCEPTION 'Bạn không có quyền sửa trường này';
 END IF;
 IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 200 THEN
   RAISE EXCEPTION 'Tên trường không hợp lệ';
 END IF;
 UPDATE public.schools SET name=v_name WHERE id=p_school_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy trường'; END IF;
 UPDATE public.students SET school_name=v_name WHERE school_id=p_school_id;
 UPDATE public.profiles SET school_name=v_name WHERE school_id=p_school_id;
END $$;

CREATE OR REPLACE FUNCTION public.update_my_school_logo(p_school_id uuid,p_logo_data text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE picture bytea;
BEGIN
 IF NOT public.is_staff() OR NOT public.can_access_school(p_school_id) THEN
   RAISE EXCEPTION 'Bạn không có quyền thay logo trường này';
 END IF;
 IF p_logo_data IS NOT NULL THEN
   IF length(p_logo_data)>220000 OR p_logo_data NOT LIKE 'data:image/png;base64,%' THEN
     RAISE EXCEPTION 'Logo phải là ảnh PNG tối đa 160 KB'; END IF;
   BEGIN picture:=decode(split_part(p_logo_data,',',2),'base64');
   EXCEPTION WHEN others THEN RAISE EXCEPTION 'Dữ liệu logo không hợp lệ'; END;
   IF octet_length(picture)>160000 OR encode(substring(picture from 1 for 8),'hex')<>'89504e470d0a1a0a'
   THEN RAISE EXCEPTION 'Ảnh PNG không hợp lệ hoặc quá lớn'; END IF;
 END IF;
 UPDATE public.schools SET logo_data=p_logo_data WHERE id=p_school_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Trường không tồn tại'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.delete_my_school(p_school_id uuid,p_confirmation text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_school public.schools%ROWTYPE; v_members integer;
BEGIN
 IF NOT public.is_staff() OR NOT public.can_access_school(p_school_id) THEN
   RAISE EXCEPTION 'Bạn không có quyền xóa trường này';
 END IF;
 SELECT * INTO v_school FROM public.schools WHERE id=p_school_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy trường'; END IF;
 IF p_confirmation IS DISTINCT FROM v_school.name THEN
   RAISE EXCEPTION 'Bạn phải nhập chính xác tên trường để xác nhận';
 END IF;
 SELECT count(*) INTO v_members FROM public.school_members WHERE school_id=p_school_id;
 IF v_members>1 AND NOT public.is_admin() THEN
   RAISE EXCEPTION 'Trường có nhiều giáo viên, chỉ Admin có thể xóa để tránh mất dữ liệu chung';
 END IF;
 DELETE FROM public.student_results WHERE school_id=p_school_id;
 DELETE FROM public.student_registrations WHERE registration_code IN
    (SELECT registration_code FROM public.classes WHERE school_id=p_school_id);
 DELETE FROM public.schools WHERE id=p_school_id;
END $$;
REVOKE ALL ON FUNCTION public.rename_my_school(uuid,text), public.update_my_school_logo(uuid,text), public.delete_my_school(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rename_my_school(uuid,text), public.update_my_school_logo(uuid,text), public.delete_my_school(uuid,text) TO authenticated;
