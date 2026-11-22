-- QLPM Web Push (opt in): devices, message/assignment event queue and pg_net webhook.
-- All subscriptions are private. No notification payload contains student names,
-- chat bodies, answers, files or other personal information.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.qlpm_push_subscriptions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE CHECK(length(endpoint) BETWEEN 20 AND 2048),
  p256dh text NOT NULL CHECK(length(p256dh) BETWEEN 32 AND 200),
  auth_secret text NOT NULL CHECK(length(auth_secret) BETWEEN 10 AND 120),
  owner_kind text NOT NULL CHECK(owner_kind IN('student','teacher')),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  touched_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((owner_kind='student' AND student_id IS NOT NULL AND teacher_id IS NULL
    AND class_id IS NOT NULL AND school_id IS NOT NULL)
    OR (owner_kind='teacher' AND teacher_id IS NOT NULL AND student_id IS NULL
    AND class_id IS NULL AND school_id IS NULL))
);
CREATE INDEX IF NOT EXISTS qlpm_push_student_idx
  ON public.qlpm_push_subscriptions(student_id) WHERE owner_kind='student';
CREATE INDEX IF NOT EXISTS qlpm_push_teacher_idx
  ON public.qlpm_push_subscriptions(teacher_id) WHERE owner_kind='teacher';

CREATE TABLE IF NOT EXISTS public.qlpm_push_events(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK(event_type IN('message_student','message_teacher','assignment','announcement')),
  event_ref uuid NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN('pending','processing','delivered')),
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  delivered_at timestamptz,
  CHECK (
    (event_type='message_student' AND student_id IS NOT NULL)
    OR (event_type='message_teacher' AND teacher_id IS NOT NULL)
    OR (event_type IN('assignment','announcement') AND class_id IS NOT NULL)
  ),
  UNIQUE(event_type,event_ref)
);
CREATE INDEX IF NOT EXISTS qlpm_push_pending_idx
 ON public.qlpm_push_events(state,created_at) WHERE state IN('pending','processing');
ALTER TABLE public.qlpm_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qlpm_push_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qlpm_push_subscriptions, public.qlpm_push_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.qlpm_push_subscriptions,public.qlpm_push_events TO service_role;

-- Read only from an Edge Function authenticated with a server secret key.
-- GRANT EXECUTE only to service_role; clients cannot read the VAPID private key.
CREATE OR REPLACE FUNCTION public.qlpm_push_server_config()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
 SELECT jsonb_build_object(
  'public_key',(SELECT decrypted_secret FROM vault.decrypted_secrets
    WHERE name='qlpm_push_vapid_public' LIMIT 1),
  'private_key',(SELECT decrypted_secret FROM vault.decrypted_secrets
    WHERE name='qlpm_push_vapid_private' LIMIT 1),
  'dispatch_secret',(SELECT decrypted_secret FROM vault.decrypted_secrets
    WHERE name='qlpm_push_dispatch_secret' LIMIT 1)
 );
$$;
REVOKE ALL ON FUNCTION public.qlpm_push_server_config() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qlpm_push_server_config() TO service_role;

-- Create one event per actual message or assignment, not per recipient.
-- This has zero impact on the existing classroom message/RPC response.
CREATE OR REPLACE FUNCTION public.qlpm_push_message_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 IF NEW.sender_kind='student' THEN
   IF EXISTS(SELECT 1 FROM public.qlpm_push_subscriptions s
     WHERE s.owner_kind='teacher' AND s.teacher_id=NEW.teacher_id) THEN
     INSERT INTO public.qlpm_push_events(event_type,event_ref,class_id,teacher_id)
      VALUES('message_teacher',NEW.id,NEW.class_id,NEW.teacher_id)
      ON CONFLICT DO NOTHING;
   END IF;
 ELSIF NEW.sender_kind='teacher' THEN
   IF EXISTS(SELECT 1 FROM public.qlpm_push_subscriptions s
     WHERE s.owner_kind='student' AND s.student_id=NEW.student_id
       AND s.class_id=NEW.class_id) THEN
     INSERT INTO public.qlpm_push_events(event_type,event_ref,class_id,student_id)
      VALUES('message_student',NEW.id,NEW.class_id,NEW.student_id)
      ON CONFLICT DO NOTHING;
   END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.qlpm_push_message_event() FROM PUBLIC;
DROP TRIGGER IF EXISTS qlpm_push_new_message ON public.qlpm_classroom_messages;
CREATE TRIGGER qlpm_push_new_message AFTER INSERT ON public.qlpm_classroom_messages
 FOR EACH ROW EXECUTE FUNCTION public.qlpm_push_message_event();

CREATE OR REPLACE FUNCTION public.qlpm_push_assignment_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 IF EXISTS(
   SELECT 1 FROM public.students st
   JOIN public.qlpm_push_subscriptions s ON s.student_id=st.id AND s.owner_kind='student'
   WHERE st.class_id=NEW.class_id AND st.school_id=NEW.school_id
     AND st.status='active' AND s.class_id=NEW.class_id
 ) THEN
   INSERT INTO public.qlpm_push_events(event_type,event_ref,class_id)
    VALUES(CASE WHEN NEW.kind='announcement' THEN 'announcement' ELSE 'assignment' END,
     NEW.id,NEW.class_id)
    ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.qlpm_push_assignment_event() FROM PUBLIC;
DROP TRIGGER IF EXISTS qlpm_push_new_post ON public.qlpm_classroom_posts;
CREATE TRIGGER qlpm_push_new_post AFTER INSERT ON public.qlpm_classroom_posts
 FOR EACH ROW EXECUTE FUNCTION public.qlpm_push_assignment_event();

-- pg_net is async and is invoked AFTER the original classroom transaction commits.
-- If Vault is not yet configured, the classroom continues to work without push.
CREATE OR REPLACE FUNCTION public.qlpm_push_dispatch_webhook()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE shared_secret text;
BEGIN
 SELECT decrypted_secret INTO shared_secret FROM vault.decrypted_secrets
   WHERE name='qlpm_push_dispatch_secret' LIMIT 1;
 IF shared_secret IS NULL THEN RETURN NEW; END IF;
 PERFORM net.http_post(
   url:='https://hzxfgwnwmpdqxkvnqyim.supabase.co/functions/v1/qlpm-push',
   body:=jsonb_build_object('action','dispatch','event_id',NEW.id),
   headers:=jsonb_build_object('Content-Type','application/json',
     'x-qlpm-push-dispatch',shared_secret),
   timeout_milliseconds:=6000
 );
 RETURN NEW;
EXCEPTION WHEN OTHERS THEN
 -- A failed push must NEVER roll back the teacher's assignment or chat message.
 RAISE LOG 'QLPM push webhook failed: %',SQLSTATE;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.qlpm_push_dispatch_webhook() FROM PUBLIC;
DROP TRIGGER IF EXISTS qlpm_push_dispatch_event ON public.qlpm_push_events;
CREATE TRIGGER qlpm_push_dispatch_event AFTER INSERT ON public.qlpm_push_events
 FOR EACH ROW EXECUTE FUNCTION public.qlpm_push_dispatch_webhook();

-- Keep queue tiny on a free Supabase project: remove old finished events opportunistically.
CREATE OR REPLACE FUNCTION public.qlpm_push_prune_events()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE n integer;
BEGIN
 DELETE FROM public.qlpm_push_events
  WHERE (state='delivered' AND delivered_at<now()-interval '4 days')
     OR created_at<now()-interval '14 days';
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.qlpm_push_prune_events() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qlpm_push_prune_events() TO service_role;
