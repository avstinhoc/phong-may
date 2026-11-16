
-- Companies / education centers are personal workspaces of the staff member
-- who creates them. Removing a workspace never removes its schools.
CREATE TABLE IF NOT EXISTS public.workplaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 150),
  kind text NOT NULL DEFAULT 'center' CHECK (kind IN ('company','center')),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  logo_data text CHECK (logo_data IS NULL OR char_length(logo_data) <= 220000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS workplaces_owner_name_unique
 ON public.workplaces (created_by, lower(btrim(name)));

CREATE TABLE IF NOT EXISTS public.workplace_schools (
 workplace_id uuid NOT NULL REFERENCES public.workplaces(id) ON DELETE CASCADE,
 school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workplace_id, school_id)
);
CREATE INDEX IF NOT EXISTS workplace_schools_school_id_idx ON public.workplace_schools(school_id);
CREATE INDEX IF NOT EXISTS workplaces_created_by_idx ON public.workplaces(created_by);
ALTER TABLE public.workplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workplace_schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workplaces_select ON public.workplaces;
CREATE POLICY workplaces_select ON public.workplaces FOR SELECT TO authenticated
 USING (public.is_staff() AND (created_by=(SELECT auth.uid()) OR public.is_admin()));
DROP POLICY IF EXISTS workplaces_insert ON public.workplaces;
CREATE POLICY workplaces_insert ON public.workplaces FOR INSERT TO authenticated
 WITH CHECK (public.is_staff() AND created_by=(SELECT auth.uid()));
DROP POLICY IF EXISTS workplaces_update ON public.workplaces;
CREATE POLICY workplaces_update ON public.workplaces FOR UPDATE TO authenticated
 USING (public.is_staff() AND (created_by=(SELECT auth.uid()) OR public.is_admin()))
 WITH CHECK (public.is_staff() AND (created_by=(SELECT auth.uid()) OR public.is_admin()));
DROP POLICY IF EXISTS workplaces_delete ON public.workplaces;
CREATE POLICY workplaces_delete ON public.workplaces FOR DELETE TO authenticated
 USING (public.is_staff() AND (created_by=(SELECT auth.uid()) OR public.is_admin()));

DROP POLICY IF EXISTS workplace_schools_select ON public.workplace_schools;
CREATE POLICY workplace_schools_select ON public.workplace_schools FOR SELECT TO authenticated
 USING (public.is_staff() AND EXISTS (
  SELECT 1 FROM public.workplaces w WHERE w.id=workplace_id
   AND (w.created_by=(SELECT auth.uid()) OR public.is_admin())
 ));
DROP POLICY IF EXISTS workplace_schools_insert ON public.workplace_schools;
CREATE POLICY workplace_schools_insert ON public.workplace_schools FOR INSERT TO authenticated
 WITH CHECK (public.is_staff() AND public.can_access_school(school_id) AND EXISTS(
  SELECT 1 FROM public.workplaces w WHERE w.id=workplace_id
   AND (w.created_by=(SELECT auth.uid()) OR public.is_admin())
 ));
DROP POLICY IF EXISTS workplace_schools_delete ON public.workplace_schools;
CREATE POLICY workplace_schools_delete ON public.workplace_schools FOR DELETE TO authenticated
 USING (public.is_staff() AND EXISTS(
  SELECT 1 FROM public.workplaces w WHERE w.id=workplace_id
   AND (w.created_by=(SELECT auth.uid()) OR public.is_admin())
 ));
REVOKE ALL ON public.workplaces,public.workplace_schools FROM PUBLIC,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.workplaces TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.workplace_schools TO authenticated;

-- Compact only historic UUID-based class registration codes.
-- The FK from student_registrations(registration_code) is ON UPDATE CASCADE.
-- Keep original codes as legacy aliases so old public URLs still work.
DO $compact$
DECLARE
 cl record; base_code text; candidate text; suffix integer;
BEGIN
 FOR cl IN
  SELECT id,school_id,class_name,registration_code,legacy_registration_codes
  FROM public.classes
  WHERE registration_code ~* '^IC3-[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$'
  ORDER BY created_at,id
 LOOP
  base_code:=public.ic3_class_code_base(cl.school_id,cl.class_name);
  candidate:=base_code;suffix:=1;
  WHILE EXISTS(
   SELECT 1 FROM public.classes c
   WHERE c.id<>cl.id
     AND (c.registration_code=candidate OR candidate=ANY(c.legacy_registration_codes))
  ) LOOP
    suffix:=suffix+1;
    IF suffix>100 THEN RAISE EXCEPTION 'Không tạo được mã ngắn cho lớp %',cl.id; END IF;
    candidate:=base_code||'-'||suffix;
  END LOOP;
  UPDATE public.classes SET
    registration_code=candidate,
    legacy_registration_codes=CASE
      WHEN cl.registration_code=ANY(coalesce(cl.legacy_registration_codes,'{}'::text[]))
       THEN legacy_registration_codes
      ELSE array_append(coalesce(legacy_registration_codes,'{}'::text[]),cl.registration_code)
    END
  WHERE id=cl.id;
 END LOOP;
END $compact$;
