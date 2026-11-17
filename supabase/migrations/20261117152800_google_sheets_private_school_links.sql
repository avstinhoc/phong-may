
-- Native Google Sheets links; keep one private source workbook per school and teacher.
-- Credentials are never stored here. A service-account secret lives only in Edge Secrets.
CREATE TABLE IF NOT EXISTS public.school_sheet_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spreadsheet_id text NOT NULL CHECK (spreadsheet_id ~ '^[A-Za-z0-9_-]{25,160}$'),
  spreadsheet_title text,
  template_tab text NOT NULL DEFAULT '6.1' CHECK (length(template_tab) BETWEEN 1 AND 80),
  status text NOT NULL DEFAULT 'unverified'
      CHECK (status IN ('unverified','verified','needs_permission','error')),
  auto_sync boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id,school_id)
);
CREATE INDEX IF NOT EXISTS school_sheet_links_owner_idx
  ON public.school_sheet_links(owner_id,school_id);

CREATE TABLE IF NOT EXISTS public.school_sheet_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.school_sheet_links(id) ON DELETE CASCADE,
  class_name text NOT NULL CHECK(length(trim(class_name)) BETWEEN 1 AND 60),
  sheet_gid integer,
  sheet_title text NOT NULL CHECK(length(sheet_title) BETWEEN 1 AND 90),
  lesson_columns jsonb NOT NULL DEFAULT '{}'::jsonb,
  student_rows jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(link_id,class_name),
  UNIQUE(link_id,sheet_title),
  CHECK(jsonb_typeof(lesson_columns)='object'),
  CHECK(jsonb_typeof(student_rows)='object')
);
CREATE INDEX IF NOT EXISTS school_sheet_tabs_link_idx ON public.school_sheet_tabs(link_id);

ALTER TABLE public.school_sheet_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_sheet_tabs ENABLE ROW LEVEL SECURITY;

CREATE POLICY sheet_links_own_read ON public.school_sheet_links FOR SELECT TO authenticated
 USING (owner_id=(SELECT auth.uid()) AND public.is_staff() AND public.can_access_school(school_id));
CREATE POLICY sheet_links_own_insert ON public.school_sheet_links FOR INSERT TO authenticated
 WITH CHECK (owner_id=(SELECT auth.uid()) AND public.is_staff() AND public.can_access_school(school_id));
CREATE POLICY sheet_links_own_update ON public.school_sheet_links FOR UPDATE TO authenticated
 USING (owner_id=(SELECT auth.uid()) AND public.is_staff() AND public.can_access_school(school_id))
 WITH CHECK(owner_id=(SELECT auth.uid()) AND public.is_staff() AND public.can_access_school(school_id));
CREATE POLICY sheet_links_own_delete ON public.school_sheet_links FOR DELETE TO authenticated
 USING (owner_id=(SELECT auth.uid()) AND public.is_staff() AND public.can_access_school(school_id));

CREATE POLICY sheet_tabs_own_read ON public.school_sheet_tabs FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.school_sheet_links l WHERE l.id=link_id AND
 l.owner_id=(SELECT auth.uid()) AND public.is_staff() AND public.can_access_school(l.school_id)));
CREATE POLICY sheet_tabs_own_insert ON public.school_sheet_tabs FOR INSERT TO authenticated
 WITH CHECK(EXISTS(SELECT 1 FROM public.school_sheet_links l WHERE l.id=link_id AND
 l.owner_id=(SELECT auth.uid()) AND public.is_staff() AND public.can_access_school(l.school_id)));
CREATE POLICY sheet_tabs_own_update ON public.school_sheet_tabs FOR UPDATE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.school_sheet_links l WHERE l.id=link_id AND
 l.owner_id=(SELECT auth.uid()) AND public.is_staff() AND public.can_access_school(l.school_id)))
 WITH CHECK(EXISTS(SELECT 1 FROM public.school_sheet_links l WHERE l.id=link_id AND
 l.owner_id=(SELECT auth.uid()) AND public.is_staff() AND public.can_access_school(l.school_id)));
CREATE POLICY sheet_tabs_own_delete ON public.school_sheet_tabs FOR DELETE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.school_sheet_links l WHERE l.id=link_id AND
 l.owner_id=(SELECT auth.uid()) AND public.is_staff() AND public.can_access_school(l.school_id)));

GRANT SELECT,INSERT,UPDATE,DELETE ON public.school_sheet_links TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.school_sheet_tabs TO authenticated;
