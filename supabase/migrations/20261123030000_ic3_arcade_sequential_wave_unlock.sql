-- Each of the 22 islands remains selectable. Only the first encounter starts unlocked.
-- Security: server rejects attempts to skip unfinished waves, without charging a retreat penalty.
-- Existing completed waves and teacher-issued stars are unaffected.
CREATE OR REPLACE FUNCTION public.ic3_arcade_turn(
 p_session_token text,p_action text DEFAULT 'status',
 p_turn uuid DEFAULT NULL,p_choice text DEFAULT NULL,p_item integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $game$
DECLARE
 who jsonb:=public.qlpm_student_desktop_whoami(p_session_token);
 sid uuid:=(who->>'student_id')::uuid;
 school uuid:=(who->>'school_id')::uuid;
 pl public.ic3_arcade_player%rowtype;
 q public.ic3_arcade_questions%rowtype;
 picked jsonb; review jsonb; response jsonb;
 ordered jsonb; wallet jsonb; map_progress jsonb;
 bonus integer:=0; outcome text; feedback text;
 zone integer; encounter integer; previous_score integer; penalty integer:=0;
 milestone_points integer; earned_award integer;
 completed integer[]; already_complete boolean;
BEGIN
 IF sid IS NULL OR school IS NULL THEN
  RAISE EXCEPTION 'Phiên học sinh đã hết hạn. Vui lòng đăng nhập lại.';
 END IF;
 INSERT INTO public.ic3_arcade_player(student_id) VALUES(sid) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT pl FROM public.ic3_arcade_player WHERE student_id=sid FOR UPDATE;
 IF pl.wave_hp<1 THEN pl.wave_hp:=160+80*pl.wave+12*pl.stage; END IF;

 -- Idempotent retry of the previous server-settled answer.
 IF p_action='answer' AND pl.turn IS NULL AND p_turn=pl.settled_turn THEN
  RETURN pl.settled_result;
 END IF;

 IF p_action='redeem' THEN
  IF p_turn IS NULL THEN RAISE EXCEPTION 'Thiếu mã lần đổi quà'; END IF;
  PERFORM id FROM public.students WHERE id=sid FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.ic3_arcade_gifts WHERE student_id=sid AND request_id=p_turn) THEN
   IF coalesce((SELECT available FROM public.ic3_star_wallets
      WHERE student_id=sid AND school_id=school),0)<2 THEN
    RAISE EXCEPTION 'Cần đủ 2 sao để đổi quà';
   END IF;
   INSERT INTO public.ic3_arcade_gifts(student_id,request_id) VALUES(sid,p_turn);
   INSERT INTO public.student_records(school_id,student_id,record_type,title,points,record_date)
   VALUES(school,sid,'reward','Săn Sao IC3 · đổi quà',-2,
      (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);
  END IF;
  outcome:='redeemed';
 ELSIF p_action='costume' THEN
  IF p_item IS NULL OR p_item NOT BETWEEN 0 AND 31 THEN
   RAISE EXCEPTION 'Trang phục không tồn tại';
  END IF;
  pl.costume:=p_item;
  outcome:='outfit_changed';
 ELSIF p_action='gear' THEN
  RAISE EXCEPTION 'Trang bị đã được thay bằng Trang phục. Vui lòng làm mới trò chơi.';
 ELSIF p_action='enter' THEN
  zone:=floor(p_item/100);
  encounter:=p_item%100;
  IF p_item IS NULL OR zone NOT BETWEEN 1 AND 22 OR encounter NOT BETWEEN 1 AND 7 THEN
   RAISE EXCEPTION 'Bản đồ hoặc ải không hợp lệ';
  END IF;
  -- Every island is visitable, but a fresh player can only enter wave 1.
  -- Finished encounters stay replayable and finishing wave N unlocks wave N+1.
  -- Preserve an ongoing encounter from the previous app version.
  IF encounter>1
    AND NOT (pl.in_battle AND pl.stage=zone AND pl.wave=encounter)
    AND NOT EXISTS (
      SELECT 1 FROM public.ic3_arcade_map_progress mp
      WHERE mp.student_id=sid AND mp.world=zone
        AND (encounter=ANY(mp.completed_waves)
             OR encounter-1=ANY(mp.completed_waves))
    ) THEN
    RAISE EXCEPTION 'Ải % chưa mở. Hãy hoàn thành ải % trước.',encounter,encounter-1;
  END IF;
  IF pl.in_battle AND (pl.stage<>zone OR pl.wave<>encounter) THEN
    previous_score:=pl.score;
    pl.score:=greatest(0,pl.score-200);
    penalty:=previous_score-pl.score;
  END IF;
  IF NOT pl.in_battle OR pl.stage<>zone OR pl.wave<>encounter THEN
   pl.stage:=zone; pl.wave:=encounter;pl.in_battle:=true;
   pl.hearts:=3;pl.wave_hp:=160+80*encounter+12*zone;
   pl.seen:='{}';pl.turn:=NULL;pl.question:=NULL;pl.deadline:=NULL;
  END IF;
  -- Same encounter re-entry resumes an active turn; no penalty.
  outcome:='entered';
 ELSIF p_action='leave' THEN
  IF pl.in_battle THEN
   previous_score:=pl.score;
   pl.score:=greatest(0,pl.score-200);
   penalty:=previous_score-pl.score;
   pl.in_battle:=false;
   pl.hearts:=3;pl.wave_hp:=160+80*pl.wave+12*pl.stage;
   pl.turn:=NULL;pl.question:=NULL;pl.deadline:=NULL;pl.seen:='{}';
  END IF;
  outcome:='left';
 ELSIF p_action='answer' AND pl.in_battle AND pl.turn IS NOT NULL AND p_turn=pl.turn THEN
  SELECT * INTO STRICT q FROM public.ic3_arcade_questions WHERE id=pl.question;
  feedback:=q.explanation;
  review:=jsonb_build_object('solution',q.solution,'lesson',q.lesson,
                            'media_title',q.media_title);
  IF clock_timestamp()<=pl.deadline AND p_choice=q.solution THEN
   outcome:='correct';pl.score:=pl.score+10;
   -- Fashion is visual-only. Existing former gear has no advantage.
   pl.wave_hp:=greatest(0,pl.wave_hp-160);
   milestone_points:=pl.score;
   bonus:=case milestone_points when 400 then 1 when 800 then 1
     when 1600 then 2 when 4200 then 2 else 0 end;
   IF bonus>0 THEN
    INSERT INTO public.ic3_arcade_score_awards(student_id,threshold)
    VALUES(sid,milestone_points) ON CONFLICT DO NOTHING
    RETURNING threshold INTO earned_award;
    IF earned_award IS NULL THEN
     bonus:=0;
    ELSE
     INSERT INTO public.student_records(
       school_id,student_id,record_type,title,points,note,record_date
     ) VALUES(
       school,sid,'reward','Săn Sao IC3 · '||pl.score||' điểm',bonus,
       'Thưởng mốc điểm lần đầu; chơi lại không cộng sao lần nữa',
       (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
     );
    END IF;
   END IF;
   IF pl.wave_hp=0 THEN
    INSERT INTO public.ic3_arcade_map_progress(student_id,world,completed_waves)
    VALUES(sid,pl.stage,ARRAY[pl.wave])
    ON CONFLICT(student_id,world) DO UPDATE SET
     completed_waves=ARRAY(
      SELECT DISTINCT x FROM unnest(
       public.ic3_arcade_map_progress.completed_waves || EXCLUDED.completed_waves
      ) x ORDER BY x
     ),
     updated_at=now();
    IF pl.wave<7 THEN
     outcome:='wave_clear';
     pl.wave:=pl.wave+1;
     pl.wave_hp:=160+80*pl.wave+12*pl.stage;
     pl.hearts:=least(3,pl.hearts+1);
    ELSE
     outcome:='victory';
     pl.in_battle:=false;
     -- Do not force another map; the player chooses from all 22 islands.
     pl.cleared:=(SELECT count(*)::integer
      FROM public.ic3_arcade_map_progress mp
      WHERE mp.student_id=sid AND cardinality(mp.completed_waves)=7);
    END IF;
    pl.seen:='{}';
   END IF;
  ELSE
   outcome:='wrong';pl.hearts:=greatest(0,pl.hearts-1);
   IF pl.hearts=0 THEN
    outcome:='defeat';pl.hearts:=3;pl.score:=0;pl.in_battle:=false;
    pl.wave_hp:=160+80*pl.wave+12*pl.stage;
    pl.seen:='{}';
   END IF;
  END IF;
  pl.turn:=NULL;pl.question:=NULL;pl.deadline:=NULL;
 ELSIF p_action='next' THEN
  IF NOT pl.in_battle THEN
   RAISE EXCEPTION 'Hãy chọn một ải trên bản đồ để bắt đầu';
  END IF;
 ELSIF p_action NOT IN ('status','answer') THEN
  RAISE EXCEPTION 'Thao tác không hợp lệ';
 END IF;

 IF p_action IN ('next','enter') AND pl.in_battle AND pl.turn IS NULL THEN
  picked:=public.ic3_pick(sid,school,pl.stage,pl.seen,false);
  IF picked IS NULL THEN
   outcome:='set_complete';pl.seen:='{}';
  ELSE
   pl.seen:=array_append(pl.seen,picked->>'concept');
   pl.question:=picked->>'id';pl.turn:=gen_random_uuid();
   pl.deadline:=clock_timestamp()+interval '30 seconds';
  END IF;
 END IF;

 UPDATE public.ic3_arcade_player SET
   stage=pl.stage,cleared=pl.cleared,score=pl.score,hearts=pl.hearts,hp=pl.hp,
   costume=pl.costume,gear=0,wave=pl.wave,wave_hp=pl.wave_hp,
   question=pl.question,turn=pl.turn,deadline=pl.deadline,seen=pl.seen,
   in_battle=pl.in_battle
 WHERE student_id=sid;

 IF pl.turn IS NOT NULL THEN
  SELECT * INTO STRICT q FROM public.ic3_arcade_questions WHERE id=pl.question;
  SELECT jsonb_agg(v ORDER BY md5(pl.turn::text||v)) INTO ordered
  FROM unnest(q.choices) v;
 END IF;
 SELECT jsonb_build_object('earned',earned,'available',available) INTO wallet
 FROM public.ic3_star_wallets WHERE student_id=sid AND school_id=school;
 SELECT coalesce(jsonb_object_agg(mp.world,mp.completed_waves),'{}'::jsonb)
 INTO map_progress FROM public.ic3_arcade_map_progress mp WHERE mp.student_id=sid;
 response:=(to_jsonb(pl)-'student_id'-'seen'-'question'-'settled_turn'-'settled_result')
 ||jsonb_build_object(
  'hp',pl.wave_hp,'wave',pl.wave,'wave_max_hp',160+80*pl.wave+12*pl.stage,
  'total_waves',7,'damage',160,'map_progress',map_progress,
  'prompt',case WHEN pl.turn IS NOT NULL THEN q.prompt END,
  'choices',ordered,'outcome',outcome,'media',
  case WHEN pl.turn IS NOT NULL THEN q.media END,
  'review',review,'feedback',feedback,'bonus',bonus,'penalty',penalty,
  'wallet',coalesce(wallet,'{"earned":0,"available":0}'::jsonb),
  'server_now',clock_timestamp());
 IF review IS NOT NULL THEN
  UPDATE public.ic3_arcade_player SET
   settled_turn=p_turn,settled_result=response WHERE student_id=sid;
 END IF;
 RETURN response;
END $game$;
REVOKE ALL ON FUNCTION public.ic3_arcade_turn(text,text,uuid,text,integer) FROM public;
GRANT EXECUTE ON FUNCTION public.ic3_arcade_turn(text,text,uuid,text,integer) TO anon,authenticated;
