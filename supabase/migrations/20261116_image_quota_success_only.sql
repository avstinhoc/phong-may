CREATE OR REPLACE FUNCTION public.get_ic3_image_quota_remaining()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_uid uuid:=auth.uid(); v_remaining integer;
BEGIN
 IF v_uid IS NULL OR NOT EXISTS
 (SELECT 1 FROM public.profiles WHERE id=v_uid AND is_active=true AND role IN ('admin','teacher','staff'))
 THEN RAISE EXCEPTION 'Bạn chưa được cấp quyền tạo ảnh'; END IF;
 SELECT CASE WHEN window_start<=now()-interval '24 hours' THEN 5 ELSE greatest(0,5-calls) END
 INTO v_remaining FROM public.ic3_image_quotas WHERE user_id=v_uid;
 RETURN coalesce(v_remaining,5);
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_ic3_image_quota_remaining() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_ic3_image_quota_remaining() TO authenticated;

COMMENT ON FUNCTION public.get_ic3_image_quota_remaining IS
 'Reads remaining successfully generated IC3 images in rolling 24 hours; caller must be approved teacher/admin.';