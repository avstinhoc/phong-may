-- QLPM two-way classroom: scoped by real student session + teacher-owned class.
-- Privacy: all three tables are RLS enabled AND inaccessible directly from anon/authenticated.
-- Only strictly scoped SECURITY DEFINER RPC functions below may access their data.
CREATE TABLE IF NOT EXISTS public.qlpm_classroom_posts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
 class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
 teacher_id uuid NOT NULL REFERENCES public.profiles(id),
 kind text NOT NULL CHECK(kind IN ('announcement','quiz','essay')),
 title text NOT NULL CHECK(char_length(title) BETWEEN 1 AND 160),
 body text NOT NULL DEFAULT '' CHECK(char_length(body)<=2500),
 questions jsonb NOT NULL DEFAULT '[]'::jsonb,
 answer_key jsonb NOT NULL DEFAULT '[]'::jsonb,
 due_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qlpm_classroom_posts_class_idx ON public.qlpm_classroom_posts(class_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.qlpm_classroom_submissions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 post_id uuid NOT NULL REFERENCES public.qlpm_classroom_posts(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
 answer jsonb NOT NULL,
 score numeric(5,2),
 feedback text NOT NULL DEFAULT '',
 graded_at timestamptz,
 submitted_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(post_id,student_id)
);
CREATE TABLE IF NOT EXISTS public.qlpm_classroom_messages(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
 class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
 teacher_id uuid NOT NULL REFERENCES public.profiles(id),
 sender_kind text NOT NULL CHECK(sender_kind IN ('student','teacher')),
 body text NOT NULL DEFAULT '' CHECK(char_length(body)<=1500),
 image_data text,
 read_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(char_length(body)>0 OR image_data IS NOT NULL),
 CHECK(image_data IS NULL OR (
  char_length(image_data)<=185000
  AND image_data ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$'
 ))
);
CREATE INDEX IF NOT EXISTS qlpm_classroom_msgs_student_idx ON public.qlpm_classroom_messages(student_id,created_at DESC);
CREATE INDEX IF NOT EXISTS qlpm_classroom_msgs_class_idx ON public.qlpm_classroom_messages(class_id,created_at DESC);
ALTER TABLE public.qlpm_classroom_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qlpm_classroom_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qlpm_classroom_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qlpm_classroom_posts,public.qlpm_classroom_submissions,public.qlpm_classroom_messages FROM PUBLIC,anon,authenticated;

-- Explicit teacher ownership prevents teachers of another class from reading student chats.
CREATE OR REPLACE FUNCTION public.qlpm_classroom_teacher_allowed(p_school uuid,p_class uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
 SELECT auth.uid() IS NOT NULL
 AND public.can_access_school(p_school)
 AND EXISTS(SELECT 1 FROM public.classes c
   WHERE c.id=p_class AND c.school_id=p_school
   AND (c.created_by=auth.uid() OR public.is_admin()))
$$;
REVOKE ALL ON FUNCTION public.qlpm_classroom_teacher_allowed(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qlpm_classroom_teacher_allowed(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.qlpm_classroom_teacher_feed(p_school_id uuid,p_class_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE cl uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_access_school(p_school_id) THEN
  RAISE EXCEPTION 'Không có quyền truy cập lớp học';
 END IF;
 IF p_class_id IS NOT NULL AND NOT public.qlpm_classroom_teacher_allowed(p_school_id,p_class_id) THEN
  RAISE EXCEPTION 'Không có quyền quản lý lớp này';
 END IF;
 SELECT c.id INTO cl FROM public.classes c
 WHERE c.school_id=p_school_id AND (c.created_by=auth.uid() OR public.is_admin())
  AND (p_class_id IS NULL OR c.id=p_class_id)
 ORDER BY c.class_name,c.created_at LIMIT 1;
 RETURN jsonb_build_object(
 'classes',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'name',c.class_name) ORDER BY c.class_name)
  FROM public.classes c WHERE c.school_id=p_school_id
  AND (c.created_by=auth.uid() OR public.is_admin()) AND c.archived_at IS NULL),'[]'::jsonb),
 'selected_class',cl,
 'students',coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'name',s.full_name) ORDER BY s.full_name)
  FROM public.students s WHERE s.class_id=cl AND s.school_id=p_school_id AND s.status='active'),'[]'::jsonb),
 'posts',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC)
  FROM (SELECT p.id,p.kind,p.title,p.body,p.questions,p.due_at,p.created_at,
    (SELECT count(*) FROM public.qlpm_classroom_submissions sub WHERE sub.post_id=p.id) AS submitted
   FROM public.qlpm_classroom_posts p WHERE p.class_id=cl
   ORDER BY p.created_at DESC LIMIT 60) t),'[]'::jsonb),
 'submissions',coalesce((SELECT jsonb_agg(jsonb_build_object('id',sub.id,'post_id',sub.post_id,
   'student_id',sub.student_id,'student_name',s.full_name,'answer',sub.answer,
   'score',sub.score,'feedback',sub.feedback,'submitted_at',sub.submitted_at,'graded_at',sub.graded_at)
   ORDER BY sub.submitted_at DESC)
  FROM public.qlpm_classroom_submissions sub
  JOIN public.qlpm_classroom_posts p ON p.id=sub.post_id
  JOIN public.students s ON s.id=sub.student_id
  WHERE p.class_id=cl),'[]'::jsonb),
 'messages',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at)
   FROM (SELECT m.id,m.student_id,s.full_name AS student_name,m.sender_kind,m.body,m.image_data,
     m.created_at,m.read_at FROM public.qlpm_classroom_messages m
     JOIN public.students s ON s.id=m.student_id
     WHERE m.class_id=cl AND m.teacher_id=auth.uid()
     ORDER BY m.created_at DESC LIMIT 120) x),'[]'::jsonb),
 'unread', (SELECT count(*) FROM public.qlpm_classroom_messages m WHERE m.class_id=cl
   AND m.teacher_id=auth.uid() AND m.sender_kind='student' AND m.read_at IS NULL)
 );
END $$;
REVOKE ALL ON FUNCTION public.qlpm_classroom_teacher_feed(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qlpm_classroom_teacher_feed(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.qlpm_classroom_teacher_action(
 p_school_id uuid,p_class_id uuid,p_action text,p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
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
  IF nullif(p_payload->>'due_at','') IS NOT NULL THEN
   due:=(p_payload->>'due_at')::timestamptz;
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
  WHERE class_id=p_class_id AND teacher_id=auth.uid()
    AND student_id=v_student_id
    AND sender_kind='student' AND read_at IS NULL;
  RETURN jsonb_build_object('ok',true);
 ELSE RAISE EXCEPTION 'Thao tác giáo viên không hợp lệ';
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.qlpm_classroom_teacher_action(uuid,uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qlpm_classroom_teacher_action(uuid,uuid,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.qlpm_classroom_student_feed(p_session_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE who jsonb:=public.qlpm_student_desktop_whoami(p_session_token);
 sid uuid:=(who->>'student_id')::uuid;
 st public.students%rowtype; tutor uuid; tutor_name text;
BEGIN
 IF sid IS NULL THEN RAISE EXCEPTION 'Phiên học sinh đã hết hạn'; END IF;
 SELECT * INTO STRICT st FROM public.students WHERE id=sid AND status='active';
 IF st.class_id IS NULL THEN RAISE EXCEPTION 'Học sinh chưa thuộc lớp học'; END IF;
 SELECT c.created_by INTO tutor FROM public.classes c
 WHERE c.id=st.class_id AND c.school_id=st.school_id;
 IF tutor IS NULL THEN RAISE EXCEPTION 'Lớp chưa có giáo viên phụ trách'; END IF;
 SELECT p.full_name INTO tutor_name FROM public.profiles p WHERE p.id=tutor;
 RETURN jsonb_build_object(
  'class_name',st.class_name,'teacher_name',coalesce(tutor_name,'Giáo viên'),
  'posts',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC) FROM
   (SELECT p.id,p.kind,p.title,p.body,p.questions,p.due_at,p.created_at,
    (SELECT jsonb_build_object('id',s.id,'answer',s.answer,'score',s.score,
      'feedback',s.feedback,'graded_at',s.graded_at,'submitted_at',s.submitted_at)
     FROM public.qlpm_classroom_submissions s
     WHERE s.post_id=p.id AND s.student_id=sid) submission
    FROM public.qlpm_classroom_posts p
    WHERE p.class_id=st.class_id AND p.school_id=st.school_id
    ORDER BY p.created_at DESC LIMIT 70) x),'[]'::jsonb),
  'messages',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at)
    FROM (SELECT m.id,m.body,m.image_data,m.sender_kind,m.created_at,m.read_at
     FROM public.qlpm_classroom_messages m WHERE m.student_id=sid
     AND m.class_id=st.class_id AND m.teacher_id=tutor
     ORDER BY m.created_at DESC LIMIT 100) x),'[]'::jsonb),
  'unread',(SELECT count(*) FROM public.qlpm_classroom_messages m WHERE m.student_id=sid
      AND m.teacher_id=tutor AND m.sender_kind='teacher' AND m.read_at IS NULL)
 );
END $$;
REVOKE ALL ON FUNCTION public.qlpm_classroom_student_feed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qlpm_classroom_student_feed(text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.qlpm_classroom_student_action(
 p_session_token text,p_action text,p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE who jsonb:=public.qlpm_student_desktop_whoami(p_session_token);
 sid uuid:=(who->>'student_id')::uuid; st public.students%rowtype;
 tutor uuid; post public.qlpm_classroom_posts%rowtype;
 payload jsonb; values_list jsonb; expected jsonb;
 points int:=0; cnt int; i int; body_text text; image_text text;
BEGIN
 IF sid IS NULL THEN RAISE EXCEPTION 'Phiên học sinh đã hết hạn'; END IF;
 SELECT * INTO STRICT st FROM public.students WHERE id=sid AND status='active';
 SELECT c.created_by INTO tutor FROM public.classes c
 WHERE c.id=st.class_id AND c.school_id=st.school_id;
 IF tutor IS NULL THEN RAISE EXCEPTION 'Không có giáo viên phụ trách lớp'; END IF;
 IF p_action='submit' THEN
  SELECT * INTO post FROM public.qlpm_classroom_posts p
   WHERE p.id=(p_payload->>'post_id')::uuid AND p.class_id=st.class_id
   AND p.school_id=st.school_id AND p.kind<>'announcement' FOR UPDATE;
  IF post.id IS NULL THEN RAISE EXCEPTION 'Bài tập không tồn tại trong lớp'; END IF;
  IF post.due_at IS NOT NULL AND clock_timestamp()>post.due_at THEN
   RAISE EXCEPTION 'Bài tập đã hết hạn nộp'; END IF;
  IF EXISTS(SELECT 1 FROM public.qlpm_classroom_submissions s
    WHERE s.student_id=sid AND s.post_id=post.id) THEN
    RAISE EXCEPTION 'Em đã nộp bài này rồi'; END IF;
  IF post.kind='quiz' THEN
   values_list:=p_payload->'choices';
   cnt:=jsonb_array_length(post.questions);
   IF jsonb_typeof(values_list) IS DISTINCT FROM 'array'
      OR jsonb_array_length(values_list)<>cnt THEN
    RAISE EXCEPTION 'Chưa trả lời đầy đủ câu hỏi'; END IF;
   FOR i IN 0..cnt-1 LOOP
    IF coalesce(values_list->>i,'') !~ '^[0-3]$' THEN
      RAISE EXCEPTION 'Vui lòng chọn một đáp án A–D cho mỗi câu'; END IF;
    IF (values_list->>i)::int=(post.answer_key->>i)::int THEN
       points:=points+1;
    END IF;
   END LOOP;
   INSERT INTO public.qlpm_classroom_submissions(post_id,student_id,answer,score,feedback,graded_at)
   VALUES(post.id,sid,jsonb_build_object('choices',values_list),
     round(points*10.0/cnt,2),'Máy chủ chấm tự động',now());
  ELSE
   body_text:=trim(coalesce(p_payload->>'essay',''));
   IF length(body_text) NOT BETWEEN 1 AND 6000 THEN
    RAISE EXCEPTION 'Bài tự luận cần từ 1 đến 6000 ký tự'; END IF;
   INSERT INTO public.qlpm_classroom_submissions(post_id,student_id,answer)
   VALUES(post.id,sid,jsonb_build_object('essay',body_text));
  END IF;
  RETURN jsonb_build_object('ok',true,'score',CASE WHEN post.kind='quiz'
    THEN round(points*10.0/jsonb_array_length(post.questions),2) ELSE NULL END);
 ELSIF p_action='send_message' THEN
  body_text:=trim(coalesce(p_payload->>'body',''));
  image_text:=nullif(p_payload->>'image_data','');
  IF length(body_text)>1500 OR (body_text='' AND image_text IS NULL)
    OR (image_text IS NOT NULL AND (length(image_text)>185000
      OR image_text !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$')) THEN
   RAISE EXCEPTION 'Nội dung tin nhắn hoặc hình ảnh không hợp lệ'; END IF;
  IF (SELECT count(*) FROM public.qlpm_classroom_messages m WHERE m.student_id=sid
      AND m.sender_kind='student' AND m.created_at>now()-interval '30 seconds')>5 THEN
    RAISE EXCEPTION 'Em gửi quá nhanh, hãy thử lại sau'; END IF;
  INSERT INTO public.qlpm_classroom_messages(school_id,class_id,student_id,teacher_id,sender_kind,body,image_data)
  VALUES(st.school_id,st.class_id,sid,tutor,'student',body_text,image_text);
  RETURN jsonb_build_object('ok',true);
 ELSIF p_action='read_messages' THEN
  UPDATE public.qlpm_classroom_messages m SET read_at=now()
   WHERE m.student_id=sid AND m.teacher_id=tutor AND m.sender_kind='teacher' AND m.read_at IS NULL;
  RETURN jsonb_build_object('ok',true);
 ELSE RAISE EXCEPTION 'Thao tác học sinh không hợp lệ';
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.qlpm_classroom_student_action(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qlpm_classroom_student_action(text,text,jsonb) TO anon,authenticated;

-- Lightweight unread counter for the teacher navigation badge and toast.
CREATE OR REPLACE FUNCTION public.qlpm_classroom_teacher_unread(p_school_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_access_school(p_school_id) THEN RETURN 0; END IF;
 RETURN (SELECT count(*)::integer FROM public.qlpm_classroom_messages m
  JOIN public.classes c ON c.id=m.class_id AND c.school_id=p_school_id
  WHERE m.school_id=p_school_id AND m.sender_kind='student' AND m.read_at IS NULL
    AND (c.created_by=auth.uid() OR public.is_admin()));
END $$;
REVOKE ALL ON FUNCTION public.qlpm_classroom_teacher_unread(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qlpm_classroom_teacher_unread(uuid) TO authenticated;
