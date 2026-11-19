-- Used by sharedClassWriteAllowed to check tab claims and count active students.
GRANT SELECT (link_id, class_name) ON public.school_sheet_tabs TO service_role;
GRANT SELECT (id, school_id, class_name, status) ON public.students TO service_role;
