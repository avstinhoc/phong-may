-- The backend verifies the school IDs and names before reusing a linked workbook.
GRANT SELECT (id, name) ON TABLE public.schools TO service_role;
