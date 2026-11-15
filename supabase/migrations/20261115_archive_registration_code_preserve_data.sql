ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS classes_active_school_idx ON public.classes(school_id,class_name) WHERE archived_at IS NULL;

CREATE OR REPLACE FUNCTION public.archive_class_registration(p_class_id uuid,p_confirmation text,p_restore boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.classes%ROWTYPE; n_students bigint;n_sessions bigint;n_registrations bigint;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Chỉ quản trị viên mới được thay đổi trạng thái mã lớp'; END IF;
 SELECT * INTO c FROM public.classes WHERE id=p_class_id FOR UPDATE;
 IF NOT FOUND OR NOT public.can_access_school(c.school_id) THEN RAISE EXCEPTION 'Không tìm thấy lớp hoặc không có quyền'; END IF;
 IF p_confirmation IS DISTINCT FROM c.class_name THEN RAISE EXCEPTION 'Cần nhập chính xác tên lớp'; END IF;
 SELECT count(*) INTO n_students FROM public.students s
 WHERE s.school_id=c.school_id AND (s.class_id=c.id OR (s.class_id IS NULL AND s.class_name=c.class_name));
 SELECT count(*) INTO n_sessions FROM public.class_sessions s
 WHERE s.school_id=c.school_id AND (s.class_id=c.id OR (s.class_id IS NULL AND s.class_name=c.class_name));
 SELECT count(*) INTO n_registrations FROM public.student_registrations r WHERE r.registration_code=c.registration_code;
 UPDATE public.classes SET archived_at=CASE WHEN p_restore THEN NULL ELSE now() END WHERE id=p_class_id;
 RETURN jsonb_build_object('archived',NOT p_restore,'students_preserved',n_students,'sessions_preserved',n_sessions,'registrations_preserved',n_registrations);
END $$;
REVOKE ALL ON FUNCTION public.archive_class_registration(uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_class_registration(uuid,text,boolean) TO authenticated;

-- Previously generated register links must not accept new submissions after archiving.
CREATE OR REPLACE FUNCTION public.block_archived_class_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.classes c WHERE c.registration_code=NEW.registration_code AND c.archived_at IS NULL)
 THEN RAISE EXCEPTION 'Mã lớp đã ngừng đăng ký hoặc không tồn tại'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_archived_registration ON public.student_registrations;
CREATE TRIGGER protect_archived_registration BEFORE INSERT OR UPDATE OF registration_code
ON public.student_registrations FOR EACH ROW EXECUTE FUNCTION public.block_archived_class_registration();

-- Keep public class portal inaccessible to deactivated registration codes.
DO $$
DECLARE fn text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO fn
 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='get_student_class_portal' LIMIT 1;
 IF fn IS NULL OR position('WHERE registration_code=upper(trim(p_code))' in fn)=0
 THEN RAISE EXCEPTION 'Unexpected portal function definition'; END IF;
 fn:=replace(fn,'WHERE registration_code=upper(trim(p_code))','WHERE registration_code=upper(trim(p_code)) AND archived_at IS NULL');
 EXECUTE fn;
END $$;
