-- Classroom chat fixes: prevent duplicate-named physical classes from hiding unread messages.
-- Private attachments are stored in Supabase Storage, never embedded as large base64 in Postgres.
ALTER TABLE public.qlpm_classroom_messages
 ADD COLUMN IF NOT EXISTS file_path text,
 ADD COLUMN IF NOT EXISTS file_name text,
 ADD COLUMN IF NOT EXISTS file_type text,
 ADD COLUMN IF NOT EXISTS file_size integer;
ALTER TABLE public.qlpm_classroom_messages
 DROP CONSTRAINT IF EXISTS qlpm_classroom_messages_check;
ALTER TABLE public.qlpm_classroom_messages
 ADD CONSTRAINT qlpm_classroom_messages_body_file_check
  CHECK (length(body)>0 OR image_data IS NOT NULL OR file_path IS NOT NULL),
 ADD CONSTRAINT qlpm_classroom_messages_file_metadata_check
  CHECK(file_path IS NULL OR (
   file_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]{1,5}$'
   AND file_name IS NOT NULL AND length(file_name) BETWEEN 1 AND 180
   AND file_type IS NOT NULL AND length(file_type) BETWEEN 4 AND 100
   AND file_size BETWEEN 1 AND 8388608
  ));
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('qlpm-classroom-private','qlpm-classroom-private',false,8388608,
 ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf',
 'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
 'text/plain','text/csv'])
 ON CONFLICT(id) DO NOTHING;
-- No storage.objects policies: no public reads or uploads; only Edge Function service role
-- may store files or issue short-lived URLs after per-thread authorization.

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
 ORDER BY (SELECT count(*) FROM public.qlpm_classroom_messages m
    WHERE m.class_id=c.id AND m.sender_kind='student' AND m.read_at IS NULL
      AND (m.teacher_id=auth.uid() OR public.is_admin())) DESC,
   (SELECT count(*) FROM public.students s WHERE s.class_id=c.id
      AND s.school_id=p_school_id AND s.status='active') DESC,
   c.class_name,c.created_at LIMIT 1;
 RETURN jsonb_build_object(
 'classes',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id',c.id,'name',c.class_name,
    'students',(SELECT count(*) FROM public.students s WHERE s.class_id=c.id
       AND s.school_id=c.school_id AND s.status='active'),
    'unread',(SELECT count(*) FROM public.qlpm_classroom_messages m
       WHERE m.class_id=c.id AND m.sender_kind='student' AND m.read_at IS NULL
         AND (m.teacher_id=auth.uid() OR public.is_admin()))
   ) ORDER BY 
    (SELECT count(*) FROM public.qlpm_classroom_messages m WHERE m.class_id=c.id
       AND m.sender_kind='student' AND m.read_at IS NULL
       AND (m.teacher_id=auth.uid() OR public.is_admin())) DESC,
     c.class_name,c.created_at)
  FROM public.classes c WHERE c.school_id=p_school_id
  AND (c.created_by=auth.uid() OR public.is_admin()) AND c.archived_at IS NULL),'[]'::jsonb),
 'selected_class',cl,
 'students',coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'name',s.full_name,
   'unread',(SELECT count(*) FROM public.qlpm_classroom_messages m WHERE m.student_id=s.id
      AND m.class_id=cl AND m.sender_kind='student' AND m.read_at IS NULL
      AND (m.teacher_id=auth.uid() OR public.is_admin()))
   ) ORDER BY
    (SELECT count(*) FROM public.qlpm_classroom_messages m WHERE m.student_id=s.id
      AND m.class_id=cl AND m.sender_kind='student' AND m.read_at IS NULL
      AND (m.teacher_id=auth.uid() OR public.is_admin())) DESC,
      s.full_name)
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
   FROM (SELECT m.id,m.student_id,s.full_name AS student_name,m.sender_kind,m.body,m.image_data,m.file_name,m.file_type,m.file_size,
     m.created_at,m.read_at FROM public.qlpm_classroom_messages m
     JOIN public.students s ON s.id=m.student_id
     WHERE m.class_id=cl AND (m.teacher_id=auth.uid() OR public.is_admin())
     ORDER BY m.created_at DESC LIMIT 80) x),'[]'::jsonb),
 'unread', (SELECT count(*) FROM public.qlpm_classroom_messages m WHERE m.class_id=cl
   AND (m.teacher_id=auth.uid() OR public.is_admin()) AND m.sender_kind='student' AND m.read_at IS NULL)
 );
END $$;

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
    FROM (SELECT m.id,m.body,m.image_data,m.file_name,m.file_type,m.file_size,m.sender_kind,m.created_at,m.read_at
     FROM public.qlpm_classroom_messages m WHERE m.student_id=sid
     AND m.class_id=st.class_id AND m.school_id=st.school_id
     ORDER BY m.created_at DESC LIMIT 100) x),'[]'::jsonb),
  'unread',(SELECT count(*) FROM public.qlpm_classroom_messages m WHERE m.student_id=sid AND m.class_id=st.class_id
      AND m.school_id=st.school_id AND m.sender_kind='teacher' AND m.read_at IS NULL)
 );
END $$;
