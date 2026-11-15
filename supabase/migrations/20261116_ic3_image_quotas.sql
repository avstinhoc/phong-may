-- Keep image generation under its own small per-user allowance.
CREATE TABLE IF NOT EXISTS public.ic3_image_quotas (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 window_start timestamptz NOT NULL DEFAULT now(),
 calls integer NOT NULL DEFAULT 0 CHECK(calls>=0)
);
ALTER TABLE public.ic3_image_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ic3_image_quotas FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.consume_ic3_image_quota()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_uid uuid:=auth.uid(); v_calls integer;
BEGIN
 IF v_uid IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.profiles WHERE id=v_uid AND is_active=true AND role IN ('admin','teacher','staff')
 ) THEN RAISE EXCEPTION 'Bạn chưa được cấp quyền sử dụng AI'; END IF;
 INSERT INTO public.ic3_image_quotas AS q(user_id,window_start,calls)
 VALUES(v_uid,now(),1)
 ON CONFLICT(user_id) DO UPDATE SET
   calls=CASE WHEN q.window_start<=now()-interval '24 hours' THEN 1 ELSE q.calls+1 END,
   window_start=CASE WHEN q.window_start<=now()-interval '24 hours' THEN now() ELSE q.window_start END
 RETURNING calls INTO v_calls;
 IF v_calls>5 THEN RAISE EXCEPTION 'Đã hết 5 lượt tạo ảnh trong 24 giờ. Hãy thử lại sau.'; END IF;
 RETURN 5-v_calls;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_ic3_image_quota() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.consume_ic3_image_quota() TO authenticated;
