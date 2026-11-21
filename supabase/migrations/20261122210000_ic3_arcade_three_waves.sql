-- Three server-validated encounters per lesson (66 waves in 22 worlds).
-- Additive migration: no player, score, star, gift or student data removed.
alter table public.ic3_arcade_player add column if not exists wave integer not null default 1;
alter table public.ic3_arcade_player add column if not exists wave_hp integer not null default 0;
-- Existing in-progress turns remain valid; wave_hp initializes on the next status call.
CREATE OR REPLACE FUNCTION public.ic3_arcade_turn(p_session_token text, p_action text DEFAULT 'status'::text, p_turn uuid DEFAULT NULL::uuid, p_choice text DEFAULT NULL::text, p_item integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 who jsonb:=public.qlpm_student_desktop_whoami(p_session_token);
 sid uuid:=(who->>'student_id')::uuid;
 school uuid:=(who->>'school_id')::uuid;
 pl public.ic3_arcade_player%rowtype;
 q public.ic3_arcade_questions%rowtype;
 bonus int:=0; outcome text; feedback text; ordered jsonb; wallet jsonb;
begin
 if sid is null then raise exception 'Phiên học sinh đã hết hạn. Vui lòng đăng nhập lại.'; end if;
 insert into public.ic3_arcade_player(student_id) values(sid) on conflict do nothing;
 select * into strict pl from public.ic3_arcade_player where student_id=sid for update;
 -- Existing player progress is retained; newly initialized wave HP starts at this lesson's first encounter.
 if pl.wave_hp<1 then pl.wave_hp:=160+95*pl.wave+10*pl.stage; end if;
 if p_action='redeem' then
   if p_turn is null then raise exception 'Thiếu mã lần đổi quà'; end if;
   perform id from public.students where id=sid for update;
   if not exists(select 1 from public.ic3_arcade_gifts where student_id=sid and request_id=p_turn) then
     if coalesce((select available from public.ic3_star_wallets where student_id=sid and school_id=school),0)<2 then raise exception 'Cần đủ 2 sao để đổi quà'; end if;
     insert into public.ic3_arcade_gifts(student_id,request_id) values(sid,p_turn);
     insert into public.student_records(school_id,student_id,record_type,title,points,record_date)
     values(school,sid,'reward','Săn Sao IC3 · đổi quà',-2,(now() at time zone 'Asia/Ho_Chi_Minh')::date);
   end if;
   outcome:='redeemed';
 elsif p_action='costume' then
   if p_item is null or p_item not between 0 and least(19,pl.cleared) then raise exception 'Trang phục chưa mở'; end if;
   pl.costume:=p_item;
 elsif p_action='gear' then
   if p_item is null or p_item not between 0 and least(5,pl.cleared/3) then raise exception 'Trang bị chưa mở'; end if;
   pl.gear:=p_item;
 elsif p_action='answer' and pl.turn is not null and p_turn=pl.turn then
   select * into strict q from public.ic3_arcade_questions where id=pl.question;
   feedback:=q.explanation;
   if clock_timestamp()<=pl.deadline and p_choice=q.solution then
     outcome:='correct';pl.score:=pl.score+10;pl.wave_hp:=greatest(0,pl.wave_hp-160-pl.gear*18);
     bonus:=case pl.score when 400 then 1 when 800 then 1 when 1600 then 2 when 4200 then 2 else 0 end;
     if bonus>0 then
       insert into public.student_records(school_id,student_id,record_type,title,points,note,record_date)
       values(school,sid,'reward','Săn Sao IC3 · '||pl.score||' điểm',bonus,'Thưởng mốc điểm trong một lượt sống',(now() at time zone 'Asia/Ho_Chi_Minh')::date);
     end if;
     if pl.wave_hp=0 then
       if pl.wave<3 then
         outcome:='wave_clear';
         pl.wave:=pl.wave+1;
         pl.wave_hp:=160+95*pl.wave+10*pl.stage;
         pl.hearts:=least(3,pl.hearts+1);
       else
         outcome:='victory';
         pl.cleared:=greatest(pl.cleared,pl.stage);
         pl.stage:=least(22,pl.stage+1);
         pl.wave:=1;
         pl.wave_hp:=160+95*pl.wave+10*pl.stage;
         pl.seen:='{}';
       end if;
     end if;
   else
     outcome:='wrong';pl.hearts:=greatest(0,pl.hearts-1);
     if pl.hearts=0 then outcome:='defeat';pl.hearts:=3;pl.score:=0;pl.wave:=1;pl.wave_hp:=160+95*pl.wave+10*pl.stage;pl.seen:='{}';end if;
   end if;
   pl.turn:=null;pl.question:=null;pl.deadline:=null;
 elsif p_action='next' and pl.turn is null then
   select * into q from public.ic3_arcade_questions where lesson<=pl.stage and not(id=any(pl.seen))
   order by (lesson=pl.stage) desc,random() limit 1;
   if not found then
     pl.seen:='{}';select * into strict q from public.ic3_arcade_questions where lesson=pl.stage order by random() limit 1;
   end if;
   pl.seen:=array_append(pl.seen,q.id);pl.question:=q.id;pl.turn:=gen_random_uuid();pl.deadline:=clock_timestamp()+interval '20 seconds';
 elsif p_action not in ('status','answer','next') then raise exception 'Thao tác không hợp lệ';end if;
 update public.ic3_arcade_player set stage=pl.stage,cleared=pl.cleared,score=pl.score,hearts=pl.hearts,hp=pl.hp,costume=pl.costume,gear=pl.gear,wave=pl.wave,wave_hp=pl.wave_hp,question=pl.question,turn=pl.turn,deadline=pl.deadline,seen=pl.seen where student_id=sid;
 if pl.turn is not null then
   select * into strict q from public.ic3_arcade_questions where id=pl.question;
   select jsonb_agg(v order by md5(pl.turn::text||v)) into ordered from unnest(q.choices) v;
 end if;
 select jsonb_build_object('earned',earned,'available',available) into wallet from public.ic3_star_wallets where student_id=sid and school_id=school;
 return (to_jsonb(pl)-'student_id'-'seen')||jsonb_build_object('hp',pl.wave_hp,'wave',pl.wave,'wave_max_hp',160+95*pl.wave+10*pl.stage,'total_waves',3,'damage',160+18*pl.gear,'prompt',case when pl.turn is not null then q.prompt end,'choices',ordered,'outcome',outcome,'feedback',feedback,'bonus',bonus,'wallet',coalesce(wallet,'{"earned":0,"available":0}'::jsonb),'server_now',clock_timestamp());
end $function$
;
