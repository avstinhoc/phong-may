-- Student Web uses its own short-lived session (not a Supabase Auth JWT).
-- The private attachment function validates that session via a SECURITY DEFINER
-- routine before reading/writing metadata with the service_role client.
-- Service-role permissions are NOT inherited from anon/authenticated in this project.
-- Grant only the minimum required for this server-side Edge Function.
-- Never grant these permissions to anon or authenticated.
GRANT EXECUTE ON FUNCTION public.qlpm_student_desktop_whoami(text)
  TO service_role;
GRANT SELECT ON TABLE public.students, public.classes
  TO service_role;
GRANT SELECT, INSERT ON TABLE public.qlpm_classroom_messages
  TO service_role;

-- Storage bucket remains private. Only the Edge Function uses service_role
-- to upload files and issue short-lived signed download URLs after authorization.
