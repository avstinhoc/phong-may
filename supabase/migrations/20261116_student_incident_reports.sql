-- IC3 GS6 classroom incidents: teacher-reviewed reports after 3 or 4 violations.
ALTER TABLE public.schools
 ADD COLUMN IF NOT EXISTS violation_report_threshold smallint NOT NULL DEFAULT 3;
ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS schools_violation_report_threshold_check;
ALTER TABLE public.schools ADD CONSTRAINT schools_violation_report_threshold_check
 CHECK (violation_report_threshold IN (3,4));

CREATE TABLE IF NOT EXISTS public.student_incident_reports(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
 milestone integer NOT NULL CHECK(milestone BETWEEN 1 AND 500),
 violation_count integer NOT NULL CHECK(violation_count>=3),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','confirmed')),
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 confirmed_at timestamptz,
 confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 UNIQUE(student_id,milestone)
);
CREATE INDEX IF NOT EXISTS student_incident_reports_school_idx
 ON public.student_incident_reports(school_id,student_id,created_at DESC);
CREATE INDEX IF NOT EXISTS student_records_student_type_idx
 ON public.student_records(student_id,record_type,record_date);

ALTER TABLE public.student_incident_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS incident_reports_school_staff ON public.student_incident_reports;
CREATE POLICY incident_reports_school_staff ON public.student_incident_reports
 FOR ALL TO authenticated
 USING (public.can_access_school(school_id))
 WITH CHECK(public.can_access_school(school_id));
REVOKE ALL ON public.student_incident_reports FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.student_incident_reports TO authenticated;

CREATE OR REPLACE FUNCTION public.after_student_violation_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE n integer; threshold integer; owner_school uuid;
BEGIN
 IF NEW.record_type IS DISTINCT FROM 'violation' THEN RETURN NEW; END IF;
 SELECT school_id INTO owner_school FROM public.students WHERE id=NEW.student_id;
 IF owner_school IS NULL OR owner_school<>NEW.school_id THEN
   RAISE EXCEPTION 'Học sinh không thuộc trường đang ghi nhận';
 END IF;
 SELECT violation_report_threshold INTO threshold FROM public.schools WHERE id=NEW.school_id;
 SELECT count(*) INTO n FROM public.student_records
  WHERE student_id=NEW.student_id AND school_id=NEW.school_id AND record_type='violation';
 IF n>=threshold AND mod(n,threshold)=0 THEN
   INSERT INTO public.student_incident_reports(school_id,student_id,milestone,violation_count)
   VALUES(NEW.school_id,NEW.student_id,n/threshold,n)
   ON CONFLICT(student_id,milestone) DO NOTHING;
 END IF;
 RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS after_student_violation_insert ON public.student_records;
CREATE TRIGGER after_student_violation_insert
 AFTER INSERT ON public.student_records FOR EACH ROW
 EXECUTE FUNCTION public.after_student_violation_insert();

-- Only confirmed reports have an issuer. Pending reports require teacher review.
CREATE OR REPLACE FUNCTION public.confirm_student_incident(p_report_id uuid,p_notes text DEFAULT '')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE rec public.student_incident_reports%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS
  (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active=true AND role IN ('admin','teacher','staff')) THEN
   RAISE EXCEPTION 'Không có quyền duyệt biên bản';
 END IF;
 SELECT * INTO rec FROM public.student_incident_reports WHERE id=p_report_id FOR UPDATE;
 IF NOT FOUND OR NOT public.can_access_school(rec.school_id) THEN
   RAISE EXCEPTION 'Không tìm thấy biên bản thuộc trường được quản lý';
 END IF;
 UPDATE public.student_incident_reports SET status='confirmed',
   notes=left(coalesce(p_notes,''),2000),confirmed_at=now(),confirmed_by=auth.uid()
 WHERE id=p_report_id AND status='draft';
 RETURN FOUND;
END;
$fn$;
REVOKE ALL ON FUNCTION public.confirm_student_incident(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_student_incident(uuid,text) TO authenticated;

-- Public portal: only show a count badge for machines, never share private report notes.
CREATE OR REPLACE FUNCTION public.get_class_violation_badges(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_class public.classes%ROWTYPE;
BEGIN
 IF p_code IS NULL OR length(trim(p_code)) NOT BETWEEN 4 AND 120
  THEN RETURN '[]'::jsonb; END IF;
 SELECT * INTO v_class FROM public.classes
 WHERE registration_code=upper(trim(p_code)) AND archived_at IS NULL LIMIT 1;
 IF NOT FOUND THEN RETURN '[]'::jsonb; END IF;
 RETURN (
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'computer',c.computer_code,
  'violations',COALESCE((
    SELECT count(*) FROM public.student_records r
    JOIN public.computer_assignments a ON a.student_id=r.student_id
    JOIN public.students st ON st.id=r.student_id
    WHERE a.computer_id=c.id AND a.active AND st.status='active'
      AND st.school_id=v_class.school_id
      AND (st.class_id=v_class.id OR (st.class_id IS NULL AND st.class_name=v_class.class_name))
      AND r.school_id=v_class.school_id AND r.record_type='violation'),0),
  'biên_bản',EXISTS(
    SELECT 1 FROM public.student_incident_reports ir
    JOIN public.computer_assignments a ON a.student_id=ir.student_id
    JOIN public.students st ON st.id=a.student_id
    WHERE a.computer_id=c.id AND a.active AND st.school_id=v_class.school_id
      AND (st.class_id=v_class.id OR (st.class_id IS NULL AND st.class_name=v_class.class_name))
      AND ir.school_id=v_class.school_id AND ir.status='confirmed')
 ) ORDER BY c.computer_code),'[]'::jsonb)
 FROM public.computers c WHERE c.school_id=v_class.school_id
 );
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_class_violation_badges(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_class_violation_badges(text) TO anon,authenticated;
