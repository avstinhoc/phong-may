-- Teacher-specific hourly wages; no changes to historical student-fee columns/data.
CREATE TABLE IF NOT EXISTS public.teacher_pay_rates (
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hourly_rate numeric(12,2) NOT NULL DEFAULT 0 CHECK(hourly_rate >= 0 AND hourly_rate <= 100000000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, teacher_id)
);
ALTER TABLE public.teacher_pay_rates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.teacher_pay_rates FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_pay_rates TO authenticated;
DROP POLICY IF EXISTS teacher_pay_rate_access ON public.teacher_pay_rates;
CREATE POLICY teacher_pay_rate_access ON public.teacher_pay_rates
  FOR ALL TO authenticated
  USING (public.can_access_school(school_id) AND (public.is_admin() OR teacher_id=auth.uid()))
  WITH CHECK (public.can_access_school(school_id) AND (public.is_admin() OR teacher_id=auth.uid()));

-- Hard-delete only a truly empty class, protecting pupils, lessons and registration history.
CREATE OR REPLACE FUNCTION public.delete_unused_class(p_class_id uuid, p_confirmation text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.classes%ROWTYPE;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Chỉ Admin được xóa lớp'; END IF;
 SELECT * INTO c FROM public.classes WHERE id=p_class_id FOR UPDATE;
 IF NOT FOUND OR NOT public.can_access_school(c.school_id) THEN
   RAISE EXCEPTION 'Không tìm thấy lớp hoặc không có quyền';
 END IF;
 IF p_confirmation IS DISTINCT FROM c.class_name THEN
   RAISE EXCEPTION 'Nhập chính xác tên lớp để xác nhận';
 END IF;
 IF EXISTS (SELECT 1 FROM public.students s WHERE s.school_id=c.school_id
              AND (s.class_id=c.id OR (s.class_id IS NULL AND s.class_name=c.class_name)))
 OR EXISTS (SELECT 1 FROM public.class_sessions s WHERE s.school_id=c.school_id
              AND (s.class_id=c.id OR (s.class_id IS NULL AND s.class_name=c.class_name)))
 OR EXISTS (SELECT 1 FROM public.student_registrations r WHERE r.registration_code=c.registration_code)
 THEN
   RAISE EXCEPTION 'Lớp đã có học sinh, lịch học hoặc hồ sơ đăng ký. Không thể xóa để tránh mất dữ liệu. Hãy chuyển hoặc xử lý dữ liệu liên quan trước.';
 END IF;
 DELETE FROM public.classes WHERE id=p_class_id;
END; $$;
REVOKE ALL ON FUNCTION public.delete_unused_class(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_unused_class(uuid,text) TO authenticated;
