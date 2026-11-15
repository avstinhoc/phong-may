-- Preserve historical school records when an Auth user and their profile are removed.
-- Foreign keys on old teacher/creator pointers use NO ACTION, so clear these nullable
-- links inside the same transaction before public.profiles is cascaded.
CREATE OR REPLACE FUNCTION public.preserve_school_history_before_account_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.class_sessions SET teacher_id = NULL WHERE teacher_id = OLD.id;
  UPDATE public.class_sessions SET created_by = NULL WHERE created_by = OLD.id;
  UPDATE public.classes SET created_by = NULL WHERE created_by = OLD.id;
  UPDATE public.cleaning_logs SET created_by = NULL WHERE created_by = OLD.id;
  UPDATE public.student_evaluations SET created_by = NULL WHERE created_by = OLD.id;
  UPDATE public.student_records SET created_by = NULL WHERE created_by = OLD.id;
  UPDATE public.students SET created_by = NULL WHERE created_by = OLD.id;
  -- school_members, teacher_pay_rates and timetable_quotas have ON DELETE CASCADE.
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.preserve_school_history_before_account_delete() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS preserve_school_history_on_profile_delete ON public.profiles;
CREATE TRIGGER preserve_school_history_on_profile_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.preserve_school_history_before_account_delete();
