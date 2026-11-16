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
 UPDATE public.class_sessions SET teacher_name=cleaned WHERE teacher_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy hồ sơ cá nhân'; END IF;
 RETURN true;
END;
$fn$;
REVOKE ALL ON FUNCTION public.ic3_update_own_profile(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ic3_update_own_profile(text,text) TO authenticated;
