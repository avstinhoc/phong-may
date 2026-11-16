
-- AI can only propose data. This function runs only after an authenticated teacher
-- confirms a draft; Gemini never gets direct database write access.
CREATE OR REPLACE FUNCTION public.ic3_apply_ai_class_import(
 p_class_id uuid,
 p_kind text,
 p_rows jsonb,
 p_overwrite_scores boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 classroom public.classes%ROWTYPE;
 school_name text;
 item jsonb; raw_name text; normalized_name text; raw_gender text;
 review jsonb; row_index integer:=0; created_count integer:=0;
 updated_count integer:=0; skipped_count integer:=0; target_id uuid;
 student_count integer; old_scores jsonb; changes jsonb; scores jsonb;
 entry record; score_value text; clean_code text; issues jsonb:='[]'::jsonb;
 keys text[]:=ARRAY['QT1','QT2','HK1','QT3','QT4','HK2',
   'TEST 1','TEST 2','TEST 3','TEST 4','TEST 5',
   'Mô phỏng lần 1','Mô phỏng lần 2','Mô phỏng lần 3',
   'Mô phỏng lần 4','Mô phỏng lần 5'];
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff() THEN
   RAISE EXCEPTION 'Bạn cần đăng nhập bằng tài khoản giáo viên được duyệt';
 END IF;
 SELECT * INTO classroom FROM public.classes WHERE id=p_class_id
   AND archived_at IS NULL FOR SHARE;
 IF NOT FOUND OR classroom.created_by IS DISTINCT FROM auth.uid() THEN
   RAISE EXCEPTION 'Chỉ giáo viên sở hữu lớp được nhập dữ liệu vào lớp này';
 END IF;
 IF NOT public.can_access_school(classroom.school_id) THEN
   RAISE EXCEPTION 'Bạn không có quyền đối với trường của lớp này';
 END IF;
 IF p_kind NOT IN ('students','grades') THEN
   RAISE EXCEPTION 'Loại dữ liệu không được hỗ trợ';
 END IF;
 IF jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 120 THEN
   RAISE EXCEPTION 'Chỉ nhập 1 đến 120 dòng dữ liệu đã xác minh';
 END IF;
 SELECT name INTO school_name FROM public.schools WHERE id=classroom.school_id;
 IF school_name IS NULL THEN RAISE EXCEPTION 'Trường không tồn tại'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(classroom.id::text,0));
 FOR item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
   row_index:=row_index+1;
   raw_name:=trim(regexp_replace(coalesce(item->>'full_name',''),'\s+',' ','g'));
   IF raw_name='' THEN
     issues:=issues||jsonb_build_array('Dòng '||row_index||': chưa có họ tên');
     skipped_count:=skipped_count+1; CONTINUE;
   END IF;
   normalized_name:=lower(extensions.unaccent(raw_name));
   IF p_kind='students' THEN
     review:=public.ic3_name_review(raw_name);
     IF review->>'decision'<>'allow' THEN
       issues:=issues||jsonb_build_array('Dòng '||row_index||' ('||raw_name||'): '||(review->>'reason'));
       skipped_count:=skipped_count+1; CONTINUE;
     END IF;
     raw_gender:=trim(coalesce(item->>'gender',''));
     IF raw_gender NOT IN ('','Nam','Nữ','Khác') THEN
       issues:=issues||jsonb_build_array('Dòng '||row_index||': giới tính không hợp lệ');
       skipped_count:=skipped_count+1; CONTINUE;
     END IF;
     clean_code:=nullif(trim(coalesce(item->>'student_code','')),'');
     IF clean_code IS NOT NULL AND length(clean_code)>40 THEN
       issues:=issues||jsonb_build_array('Dòng '||row_index||': mã học sinh quá dài');
       skipped_count:=skipped_count+1; CONTINUE;
     END IF;
     IF EXISTS(SELECT 1 FROM public.students st WHERE
       st.school_id=classroom.school_id AND st.status='active'
       AND (st.class_id=classroom.id OR (st.class_id IS NULL AND st.class_name=classroom.class_name AND st.created_by=auth.uid()))
       AND lower(extensions.unaccent(st.full_name))=normalized_name) THEN
       issues:=issues||jsonb_build_array('Đã có học sinh '||raw_name||' trong lớp; bỏ qua để tránh trùng');
       skipped_count:=skipped_count+1; CONTINUE;
     END IF;
     INSERT INTO public.students(
       school_id,class_id,class_name,school_name,full_name,student_code,gender,status,created_by)
     VALUES(classroom.school_id,classroom.id,classroom.class_name,school_name,
       raw_name,clean_code,nullif(raw_gender,''),'active',auth.uid());
     created_count:=created_count+1;
   ELSE
     SELECT count(*),min(id) INTO student_count,target_id FROM public.students st
       WHERE st.school_id=classroom.school_id AND st.status='active'
         AND (st.class_id=classroom.id OR (st.class_id IS NULL AND st.class_name=classroom.class_name AND st.created_by=auth.uid()))
         AND lower(extensions.unaccent(st.full_name))=normalized_name;
     IF student_count<>1 THEN
       issues:=issues||jsonb_build_array('Điểm của '||raw_name||': '
         ||CASE WHEN student_count=0 THEN 'chưa tìm thấy học sinh trong lớp'
                 ELSE 'có nhiều học sinh trùng họ tên, cần xác định thủ công' END);
       skipped_count:=skipped_count+1; CONTINUE;
     END IF;
     scores:=item->'scores';
     IF jsonb_typeof(scores)<>'object' OR scores='{}'::jsonb THEN
       issues:=issues||jsonb_build_array('Điểm của '||raw_name||': không có cột điểm hợp lệ');
       skipped_count:=skipped_count+1; CONTINUE;
     END IF;
     SELECT coalesce(sr.scores,'{}'::jsonb) INTO old_scores
       FROM public.student_results sr WHERE sr.student_id=target_id FOR UPDATE;
     old_scores:=coalesce(old_scores,'{}'::jsonb);
     changes:='{}'::jsonb;
     FOR entry IN SELECT key,value FROM jsonb_each(scores) LOOP
       IF NOT(entry.key=ANY(keys)) THEN
         issues:=issues||jsonb_build_array('Điểm của '||raw_name||': không hỗ trợ cột '||left(entry.key,60));
         CONTINUE;
       END IF;
       score_value:=trim(entry.value#>>'{}');
       IF score_value IS NULL OR score_value !~ '^(10(\.0{1,2})?|[0-9](\.[0-9]{1,2})?)$' THEN
         issues:=issues||jsonb_build_array('Điểm của '||raw_name||' ('||entry.key||'): '
           ||left(score_value,25)||' không thuộc 0–10');
         CONTINUE;
       END IF;
       IF old_scores ? entry.key AND NOT p_overwrite_scores THEN
         issues:=issues||jsonb_build_array('Điểm của '||raw_name||' ('||entry.key||') đã có, không ghi đè');
         CONTINUE;
       END IF;
       changes:=changes||jsonb_build_object(entry.key,score_value::numeric);
     END LOOP;
     IF changes='{}'::jsonb THEN skipped_count:=skipped_count+1; CONTINUE; END IF;
     INSERT INTO public.student_results(school_id,student_id,scores,updated_at)
       VALUES(classroom.school_id,target_id,changes,now())
     ON CONFLICT(student_id) DO UPDATE SET
       scores=coalesce(public.student_results.scores,'{}'::jsonb)||EXCLUDED.scores,
       updated_at=now();
     updated_count:=updated_count+1;
   END IF;
 END LOOP;
 RETURN jsonb_build_object('created',created_count,'updated',updated_count,
   'skipped',skipped_count,'issues',issues,'class_name',classroom.class_name);
END;
$fn$;
REVOKE ALL ON FUNCTION public.ic3_apply_ai_class_import(uuid,text,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ic3_apply_ai_class_import(uuid,text,jsonb,boolean) TO authenticated;

-- Single-school legacy rows must belong to the same class owner, too.
