-- Dedicated, database-atomic rate limit for the in-app AI help assistant.
-- Keeps the timetable-reading allowance independent of teachers' help questions.
CREATE TABLE IF NOT EXISTS public.help_ai_quotas (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hour_started_at timestamptz NOT NULL DEFAULT now(),
  calls integer NOT NULL DEFAULT 0 CHECK (calls>=0)
);
ALTER TABLE public.help_ai_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.help_ai_quotas FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_help_ai_quota()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_uid uuid := auth.uid(); v_calls integer;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.id=v_uid AND p.is_active=true AND p.role IN ('admin','teacher','staff')
  ) THEN RAISE EXCEPTION 'Tài khoản chưa được cấp quyền';
  END IF;
  INSERT INTO public.help_ai_quotas AS q(user_id,hour_started_at,calls)
  VALUES (v_uid, now(), 1)
  ON CONFLICT(user_id) DO UPDATE SET
    calls=CASE WHEN q.hour_started_at<=now()-interval '1 hour' THEN 1 ELSE q.calls+1 END,
    hour_started_at=CASE WHEN q.hour_started_at<=now()-interval '1 hour' THEN now() ELSE q.hour_started_at END
  RETURNING calls INTO v_calls;
  IF v_calls>25 THEN
    RAISE EXCEPTION 'Đã hết 25 câu hỏi AI trong một giờ. Hãy xem Hướng dẫn nhanh và thử lại sau.';
  END IF;
  RETURN 25-v_calls;
END $$;
REVOKE ALL ON FUNCTION public.consume_help_ai_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_help_ai_quota() TO authenticated;
