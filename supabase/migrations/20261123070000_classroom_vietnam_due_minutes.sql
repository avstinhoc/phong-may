-- Deadline options: absolute Vietnam time or relative minutes calculated on database clock.
CREATE OR REPLACE FUNCTION public.qlpm_classroom_teacher_action(p_school_id uuid, p_class_id uuid, p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 kind text; title text; body_text text; due timestamptz;
 items jsonb; item jsonb; sanitized jsonb:='[]'::jsonb; keys jsonb:='[]'::jsonb;
 post_id uuid; v_student_id uuid; record_id uuid;
 score_value numeric; result jsonb; image_text text; question_count int;
BEGIN
 IF NOT public.qlpm_classroom_teacher_allowed(p_school_id,p_class_id) THEN
  RAISE EXCEPTION 'Không có quyền quản lý lớp này';
 END IF;
 IF p_action='create_post' THEN
  kind:=p_payload->>'kind';title:=trim(coalesce(p_payload->>'title',''));
  body_text:=trim(coalesce(p_payload->>'body',''));
  IF kind NOT IN ('announcement','quiz','essay') OR length(title) NOT BETWEEN 1 AND 160
    OR length(body_text)>2500 THEN RAISE EXCEPTION 'Nội dung bài đăng không hợp lệ'; END IF;
  -- Deadline is either local Vietnam clock time or minutes after publish (server clock).
  IF nullif(btrim(coalesce(p_payload->>'due_at','')),'') IS NOT NULL
    AND nullif(btrim(coalesce(p_payload->>'due_minutes','')),'') IS NOT NULL THEN
    RAISE EXCEPTION 'Chỉ chọn giờ Việt Nam hoặc số phút, không chọn cả hai';
  END IF;
  IF nullif(btrim(coalesce(p_payload->>'due_minutes','')),'') IS NOT NULL THEN
    IF (p_payload->>'due_minutes') !~ '^[0-9]{1,5}$' THEN
      RAISE EXCEPTION 'Số phút phải là số nguyên từ 1 đến 10080';
    END IF;
    IF (p_payload->>'due_minutes')::integer NOT BETWEEN 1 AND 10080 THEN
      RAISE EXCEPTION 'Số phút phải từ 1 đến 10080';
    END IF;
    due:=statement_timestamp()+make_interval(mins=>(p_payload->>'due_minutes')::integer);
  ELSIF nullif(btrim(coalesce(p_payload->>'due_at','')),'') IS NOT NULL THEN
    IF (p_payload->>'due_at') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$' THEN
      RAISE EXCEPTION 'Ngày giờ Việt Nam không hợp lệ';
    END IF;
    due:=(p_payload->>'due_at')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';
    IF due<=statement_timestamp() THEN
      RAISE EXCEPTION 'Hạn nộp phải sau thời điểm giao bài';
    END IF;
  END IF;
  IF kind='quiz' THEN
   items:=p_payload->'questions';
   IF jsonb_typeof(items) IS DISTINCT FROM 'array' OR jsonb_array_length(items) NOT BETWEEN 1 AND 10 THEN
     RAISE EXCEPTION 'Bài trắc nghiệm cần 1–10 câu hỏi'; END IF;
   FOR item IN SELECT value FROM jsonb_array_elements(items) LOOP
    IF jsonb_typeof(item->'choices') IS DISTINCT FROM 'array'
      OR jsonb_array_length(item->'choices')<>4
      OR trim(coalesce(item->>'prompt',''))='' OR length(item->>'prompt')>550
      OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(item->'choices') x
        WHERE length(trim(x.value)) NOT BETWEEN 1 AND 250)
      OR (SELECT count(DISTINCT lower(trim(x.value))) FROM jsonb_array_elements_text(item->'choices') x)<>4
      OR coalesce(item->>'correct','') !~ '^[0-3]$'
    THEN RAISE EXCEPTION 'Mỗi câu hỏi cần đúng 4 đáp án A–D'; END IF;
    sanitized:=sanitized||jsonb_build_array(jsonb_build_object(
      'prompt',trim(item->>'prompt'),'choices',item->'choices'));
    keys:=keys||jsonb_build_array((item->>'correct')::integer);
   END LOOP;
  ELSIF kind='essay' AND body_text='' THEN
    RAISE EXCEPTION 'Bài tự luận phải có nội dung hướng dẫn';
  END IF;
  INSERT INTO public.qlpm_classroom_posts(school_id,class_id,teacher_id,kind,title,body,questions,answer_key,due_at)
  VALUES(p_school_id,p_class_id,auth.uid(),kind,title,body_text,sanitized,keys,due)
  RETURNING id INTO post_id;
  RETURN jsonb_build_object('ok',true,'id',post_id);
 ELSIF p_action='delete_post' THEN
  post_id:=(p_payload->>'post_id')::uuid;
  DELETE FROM public.qlpm_classroom_posts
   WHERE id=post_id AND class_id=p_class_id AND school_id=p_school_id;
  RETURN jsonb_build_object('ok',FOUND);
 ELSIF p_action='grade' THEN
  record_id:=(p_payload->>'submission_id')::uuid;
  score_value:=(p_payload->>'score')::numeric;
  IF score_value<0 OR score_value>10 OR length(coalesce(p_payload->>'feedback',''))>1000 THEN
   RAISE EXCEPTION 'Điểm phải từ 0 đến 10'; END IF;
  UPDATE public.qlpm_classroom_submissions s SET score=score_value,
   feedback=coalesce(p_payload->>'feedback',''),graded_at=now()
  FROM public.qlpm_classroom_posts p
  WHERE s.id=record_id AND p.id=s.post_id AND p.class_id=p_class_id
    AND p.school_id=p_school_id AND p.kind='essay';
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy bài tự luận'; END IF;
  RETURN jsonb_build_object('ok',true);
 ELSIF p_action='send_message' THEN
  v_student_id:=(p_payload->>'student_id')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.students s WHERE s.id=v_student_id
    AND s.school_id=p_school_id AND s.class_id=p_class_id AND s.status='active') THEN
   RAISE EXCEPTION 'Học sinh không thuộc lớp này'; END IF;
  body_text:=trim(coalesce(p_payload->>'body',''));
  image_text:=nullif(p_payload->>'image_data','');
  IF length(body_text)>1500 OR (body_text='' AND image_text IS NULL)
    OR (image_text IS NOT NULL AND (length(image_text)>185000
     OR image_text !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$'))
  THEN RAISE EXCEPTION 'Tin nhắn hoặc ảnh không hợp lệ'; END IF;
  INSERT INTO public.qlpm_classroom_messages(school_id,class_id,student_id,teacher_id,sender_kind,body,image_data)
  VALUES(p_school_id,p_class_id,v_student_id,auth.uid(),'teacher',body_text,image_text);
  RETURN jsonb_build_object('ok',true);
 ELSIF p_action='read_messages' THEN
  v_student_id:=(p_payload->>'student_id')::uuid;
  UPDATE public.qlpm_classroom_messages SET read_at=now()
  WHERE class_id=p_class_id AND (teacher_id=auth.uid() OR public.is_admin())
    AND student_id=v_student_id
    AND sender_kind='student' AND read_at IS NULL;
  RETURN jsonb_build_object('ok',true);
 ELSE RAISE EXCEPTION 'Thao tác giáo viên không hợp lệ';
 END IF;
END $function$;
