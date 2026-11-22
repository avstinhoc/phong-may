-- The push handler checks the verified teacher identity against these fields.
GRANT SELECT (id, role, is_active) ON public.profiles TO service_role;
