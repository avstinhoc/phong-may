-- Separate personal teacher calendars at the database level.
-- Admin sees/manages all schedules in assigned schools; teachers/staff only their own.
-- Legacy imported sessions without an owner remain visible to Admin for assignment.
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_operations ON public.class_sessions;
DROP POLICY IF EXISTS personal_session_read ON public.class_sessions;
DROP POLICY IF EXISTS personal_session_insert ON public.class_sessions;
DROP POLICY IF EXISTS personal_session_update ON public.class_sessions;
DROP POLICY IF EXISTS personal_session_delete ON public.class_sessions;
CREATE POLICY personal_session_read ON public.class_sessions FOR SELECT TO authenticated
 USING (
   public.can_access_school(school_id) AND (
      public.is_admin() OR teacher_id=auth.uid() OR (teacher_id IS NULL AND created_by=auth.uid())
   )
 );
CREATE POLICY personal_session_insert ON public.class_sessions FOR INSERT TO authenticated
 WITH CHECK (
  public.can_access_school(school_id) AND
  (public.is_admin() OR (teacher_id=auth.uid() AND created_by=auth.uid()))
 );
CREATE POLICY personal_session_update ON public.class_sessions FOR UPDATE TO authenticated
 USING (
  public.can_access_school(school_id) AND (
   public.is_admin() OR teacher_id=auth.uid() OR (teacher_id IS NULL AND created_by=auth.uid())
  )
 )
 WITH CHECK (
  public.can_access_school(school_id) AND
  (public.is_admin() OR (teacher_id=auth.uid() AND created_by=auth.uid()))
 );
CREATE POLICY personal_session_delete ON public.class_sessions FOR DELETE TO authenticated
 USING (
  public.can_access_school(school_id) AND (
   public.is_admin() OR teacher_id=auth.uid() OR (teacher_id IS NULL AND created_by=auth.uid())
  )
 );
