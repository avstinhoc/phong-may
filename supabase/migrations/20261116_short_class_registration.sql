-- IC3 GS6: short class codes, owner-scoped classes and safer self-registration.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS legacy_registration_codes text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS auto_approve boolean NOT NULL DEFAULT false;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.student_registrations
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS review_note text;
DO $c$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='ic3_students_gender_check') THEN
   ALTER TABLE public.students ADD CONSTRAINT ic3_students_gender_check CHECK(gender IN ('Nam','Nữ','Khác') OR gender IS NULL);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='ic3_registrations_gender_check') THEN
   ALTER TABLE public.student_registrations ADD CONSTRAINT ic3_registrations_gender_check CHECK(gender IN ('Nam','Nữ','Khác') OR gender IS NULL);
 END IF;
END $c$;

CREATE OR REPLACE FUNCTION public.ic3_class_code_base(p_school_id uuid,p_class_name text)
 RETURNS text LANGUAGE plpgsql STABLE SET search_path=''
AS $fn$
DECLARE n text; school_label text; class_label text;
BEGIN
 SELECT name INTO n FROM public.schools WHERE id=p_school_id;
 IF n IS NULL THEN RAISE EXCEPTION 'Trường không tồn tại'; END IF;
 school_label:=upper(extensions.unaccent(n));
 school_label:=regexp_replace(school_label,'^(TRUONG\s+)?(THCS|THPT|TRUNG HOC CO SO|TIEU HOC)\s+','','i');
 school_label:=left(regexp_replace(replace(school_label,'Đ','D'),'[^A-Z0-9]','','g'),18);
 class_label:=left(regexp_replace(upper(extensions.unaccent(trim(p_class_name))),'[^A-Z0-9.]','','g'),24);
 IF school_label='' OR class_label='' THEN RAISE EXCEPTION 'Tên trường hoặc lớp không hợp lệ'; END IF;
 RETURN 'IC3-'||school_label||'-'||class_label;
END;
$fn$;
REVOKE ALL ON FUNCTION public.ic3_class_code_base(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ic3_class_code_base(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.ic3_resolve_class_code(p_code text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT registration_code FROM public.classes
 WHERE archived_at IS NULL AND
 (registration_code=upper(trim(p_code)) OR upper(trim(p_code))=ANY(legacy_registration_codes))
 LIMIT 1;
$fn$;
REVOKE ALL ON FUNCTION public.ic3_resolve_class_code(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ic3_resolve_class_code(text) TO anon,authenticated;

-- Keep old shared links functional while renaming live classes. Existing registration
-- rows follow registration_code through their ON UPDATE CASCADE FK.
DO $migration$
DECLARE rec record; base text; candidate text; n int;
BEGIN
 FOR rec IN
 SELECT c.id,c.school_id,c.class_name,c.registration_code
 FROM public.classes c
 ORDER BY CASE WHEN c.registration_code='IC3-DA2FE7F3-F372-4FE6-97FE-5B112E15F4FB' THEN 0 ELSE 1 END,
          c.created_at,c.id
 LOOP
   IF rec.registration_code ~ '^IC3-[A-Z0-9]+-[A-Z0-9.]+(-[0-9]+)?$' AND length(rec.registration_code)<=38
   THEN CONTINUE; END IF;
   base:=public.ic3_class_code_base(rec.school_id,rec.class_name);
   candidate:=base;n:=1;
   WHILE EXISTS(SELECT 1 FROM public.classes WHERE registration_code=candidate AND id<>rec.id) LOOP
     n:=n+1;candidate:=base||'-'||n;
     IF n>100 THEN RAISE EXCEPTION 'Hết mã lớp ngắn cho %',base; END IF;
   END LOOP;
   UPDATE public.classes
   SET legacy_registration_codes=array_append(legacy_registration_codes,registration_code),
       registration_code=candidate
   WHERE id=rec.id;
 END LOOP;
END $migration$;

-- New classes are always owned by their creator. Duplicate owner/school/class is rejected.
CREATE OR REPLACE FUNCTION public.ic3_create_class(p_school_id uuid,p_class_name text,p_auto_approve boolean DEFAULT true)
RETURNS public.classes LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE existing public.classes%ROWTYPE; slug text; candidate text; n int:=1; clean_name text;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active AND role IN ('admin','teacher','staff')
 ) OR NOT public.can_access_school(p_school_id) THEN RAISE EXCEPTION 'Không có quyền tạo lớp ở trường này'; END IF;
 clean_name:=trim(regexp_replace(coalesce(p_class_name,''),'\s+',' ','g'));
 IF length(clean_name) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'Tên lớp phải từ 2 đến 80 ký tự'; END IF;
 IF EXISTS(SELECT 1 FROM public.classes WHERE school_id=p_school_id AND created_by=auth.uid()
  AND lower(class_name)=lower(clean_name) AND archived_at IS NULL)
 THEN RAISE EXCEPTION 'Bạn đã có lớp này tại trường được chọn'; END IF;
 slug:=public.ic3_class_code_base(p_school_id,clean_name);
 candidate:=slug;
 WHILE EXISTS(SELECT 1 FROM public.classes WHERE registration_code=candidate) LOOP
  n:=n+1;candidate:=slug||'-'||n;
  IF n>100 THEN RAISE EXCEPTION 'Không tạo được mã lớp ngắn duy nhất'; END IF;
 END LOOP;
 INSERT INTO public.classes(school_id,class_name,registration_code,created_by,auto_approve)
 VALUES(p_school_id,clean_name,candidate,auth.uid(),coalesce(p_auto_approve,false))
 RETURNING * INTO existing;
 RETURN existing;
END;
$fn$;
REVOKE ALL ON FUNCTION public.ic3_create_class(uuid,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ic3_create_class(uuid,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.ic3_set_auto_approve(p_class_id uuid,p_value boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE c public.classes%ROWTYPE;
BEGIN
 SELECT * INTO c FROM public.classes WHERE id=p_class_id FOR UPDATE;
 IF NOT FOUND OR c.created_by IS DISTINCT FROM auth.uid() OR NOT public.can_access_school(c.school_id)
 THEN RAISE EXCEPTION 'Chỉ người tạo lớp mới thay đổi cài đặt duyệt tự động'; END IF;
 UPDATE public.classes SET auto_approve=coalesce(p_value,false) WHERE id=p_class_id;
 RETURN coalesce(p_value,false);
END;
$fn$;
REVOKE ALL ON FUNCTION public.ic3_set_auto_approve(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ic3_set_auto_approve(uuid,boolean) TO authenticated;

-- Anonymous users must register through the validated RPC rather than direct table inserts.
DROP POLICY IF EXISTS registration_submit ON public.student_registrations;
REVOKE INSERT ON public.student_registrations FROM anon;
