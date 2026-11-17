-- Teacher and admin see/manage only workplaces they created.
-- Do not alter role-based account administration or shared teaching school permissions.
DROP POLICY IF EXISTS workplaces_select ON public.workplaces;
CREATE POLICY workplaces_select ON public.workplaces
 FOR SELECT TO authenticated USING (public.is_staff() AND created_by=(SELECT auth.uid()));
DROP POLICY IF EXISTS workplaces_update ON public.workplaces;
CREATE POLICY workplaces_update ON public.workplaces
 FOR UPDATE TO authenticated USING (public.is_staff() AND created_by=(SELECT auth.uid()))
 WITH CHECK (public.is_staff() AND created_by=(SELECT auth.uid()));
DROP POLICY IF EXISTS workplaces_delete ON public.workplaces;
CREATE POLICY workplaces_delete ON public.workplaces
 FOR DELETE TO authenticated USING (public.is_staff() AND created_by=(SELECT auth.uid()));
DROP POLICY IF EXISTS workplace_schools_select ON public.workplace_schools;
CREATE POLICY workplace_schools_select ON public.workplace_schools
 FOR SELECT TO authenticated USING (public.is_staff() AND EXISTS(
   SELECT 1 FROM public.workplaces w WHERE w.id=workplace_schools.workplace_id AND w.created_by=(SELECT auth.uid())));
DROP POLICY IF EXISTS workplace_schools_insert ON public.workplace_schools;
CREATE POLICY workplace_schools_insert ON public.workplace_schools
 FOR INSERT TO authenticated WITH CHECK (public.is_staff() AND public.can_access_school(school_id) AND EXISTS(
   SELECT 1 FROM public.workplaces w WHERE w.id=workplace_schools.workplace_id AND w.created_by=(SELECT auth.uid())));
DROP POLICY IF EXISTS workplace_schools_delete ON public.workplace_schools;
CREATE POLICY workplace_schools_delete ON public.workplace_schools
 FOR DELETE TO authenticated USING (public.is_staff() AND EXISTS(
   SELECT 1 FROM public.workplaces w WHERE w.id=workplace_schools.workplace_id AND w.created_by=(SELECT auth.uid())));
