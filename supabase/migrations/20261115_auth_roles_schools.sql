begin;
alter table public.profiles add column if not exists is_active boolean not null default true;
create table if not exists public.school_members (
 school_id uuid not null references public.schools(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 primary key(school_id,user_id)
);
alter table public.school_members enable row level security;
insert into public.school_members select school_id,id from public.profiles where school_id is not null on conflict do nothing;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin' and is_active) $$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from profiles where id=auth.uid() and role in ('admin','teacher','staff') and is_active) $$;
create or replace function public.can_access_school(sid uuid) returns boolean language sql stable security definer set search_path=public
as $$ select public.is_staff() and (public.is_admin() or exists(select 1 from school_members where school_id=sid and user_id=auth.uid())) $$;

-- Signup creates a profile even when email confirmation means there is no browser session.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public
as $$ begin
 insert into public.profiles(id,email,full_name,role)
 values(new.id,new.email,left(coalesce(new.raw_user_meta_data->>'full_name',''),200),'pending')
 on conflict(id) do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id,email,full_name,role)
select id,email,left(coalesce(raw_user_meta_data->>'full_name',''),200),'pending' from auth.users on conflict(id) do nothing;

-- Remove the old permissive policies before installing the new policy set.
do $$ declare p record; begin
 for p in select tablename,policyname from pg_policies where schemaname='public' and tablename = any(array['profiles','schools','school_members','classes','students','computers','computer_assignments','class_sessions','attendance','student_records','cleaning_logs','student_evaluations','student_registrations']) loop
 execute format('drop policy %I on public.%I',p.policyname,p.tablename);
 end loop;
end $$;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy school_read on public.schools for select to authenticated using(public.can_access_school(id));
create policy membership_read on public.school_members for select to authenticated using(user_id=auth.uid() or public.is_admin());
do $$ declare t text; begin
 foreach t in array array['classes','students','computers','computer_assignments','class_sessions','attendance','student_records','cleaning_logs','student_evaluations'] loop
 execute format('create policy school_operations on public.%I for all to authenticated using(public.can_access_school(school_id)) with check(public.can_access_school(school_id))',t);
 end loop;
end $$;
create policy registration_submit on public.student_registrations for insert to anon,authenticated with check(status='pending');
create policy registration_read on public.student_registrations for select to authenticated using(exists(select 1 from public.classes c where c.registration_code=student_registrations.registration_code and public.can_access_school(c.school_id)));
create policy registration_update on public.student_registrations for update to authenticated using(exists(select 1 from public.classes c where c.registration_code=student_registrations.registration_code and public.can_access_school(c.school_id))) with check(exists(select 1 from public.classes c where c.registration_code=student_registrations.registration_code and public.can_access_school(c.school_id)));

create or replace function public.admin_update_account(target_id uuid,new_role text,active boolean,display_name text)
returns void language plpgsql security definer set search_path=public as $$ begin
 if not public.is_admin() then raise exception 'Chỉ Admin được quản lý tài khoản'; end if;
 if target_id=auth.uid() then raise exception 'Không thể thay đổi quyền của chính mình'; end if;
 if new_role not in ('admin','teacher','pending') or new_role is null or active is null then raise exception 'Vai trò không hợp lệ'; end if;
 update profiles set role=new_role,is_active=active,full_name=left(trim(display_name),200) where id=target_id;
 if not found then raise exception 'Không tìm thấy tài khoản'; end if;
end $$;

create or replace function public.create_my_school(school_name text) returns uuid language plpgsql security definer set search_path=public as $$
declare sid uuid; clean text:=trim(school_name); begin
 if not public.is_staff() then raise exception 'Tài khoản chưa được cấp quyền'; end if;
 if clean is null or length(clean) not between 1 and 200 then raise exception 'Tên trường phải từ 1 đến 200 ký tự'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select s.id into sid from schools s join school_members m on m.school_id=s.id where m.user_id=auth.uid() and lower(trim(s.name))=lower(clean) order by s.created_at limit 1;
 if sid is null then
 insert into schools(name) values(clean) returning id into sid;
 insert into school_members values(sid,auth.uid());
 end if;
 return sid;
end $$;

-- Enforce same-school foreign keys, including clients that bypass the UI.
create or replace function public.check_school_references() returns trigger language plpgsql security definer set search_path=public as $$
declare doc jsonb:=to_jsonb(new); col text; parent text; sid uuid; rid uuid; begin
 foreach col in array array['class_id','computer_id','student_id','session_id'] loop
 if doc ? col and doc->>col is not null then
 parent:=case col when 'class_id' then 'classes' when 'computer_id' then 'computers' when 'student_id' then 'students' else 'class_sessions' end;
 rid:=(doc->>col)::uuid;
 execute format('select school_id from public.%I where id=$1',parent) into sid using rid;
 if sid is distinct from new.school_id then raise exception 'Dữ liệu liên kết không thuộc trường đang chọn'; end if;
 end if; end loop;
 if TG_OP='UPDATE' and new.school_id is distinct from old.school_id then raise exception 'Không được chuyển bản ghi sang trường khác'; end if;
 if doc ? 'teacher_id' and doc->>'teacher_id' is not null and auth.uid() is not null and not public.is_admin() and (doc->>'teacher_id')::uuid<>auth.uid() then raise exception 'Chỉ tạo lịch cho chính mình'; end if;
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['classes','students','computers','computer_assignments','class_sessions','attendance','student_records','cleaning_logs','student_evaluations'] loop
 execute format('drop trigger if exists check_school_references on public.%I',t);
 execute format('create trigger check_school_references before insert or update on public.%I for each row execute function public.check_school_references()',t);
 end loop;
end $$;

create or replace function public.import_timetable(items jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare r jsonb; sid uuid; cid uuid; d date; st time; et time; n integer:=0; skipped integer:=0; teacher text; periods integer; begin
 if not public.is_staff() then raise exception 'Tài khoản chưa được cấp quyền'; end if;
 if jsonb_typeof(items)<>'array' or jsonb_array_length(items) not between 1 and 500 then raise exception 'Chọn từ 1 đến 500 buổi học'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select full_name into teacher from profiles where id=auth.uid();
 for r in select value from jsonb_array_elements(items) loop
 if coalesce(trim(r->>'class_name'),'')='' or length(r->>'class_name')>200 then raise exception 'Thiếu tên lớp hoặc tên quá dài'; end if;
 d:=nullif(r->>'session_date','')::date; st:=nullif(r->>'start_time','')::time; et:=nullif(r->>'end_time','')::time; periods:=coalesce(nullif(r->>'period_count','')::integer,1);
 if d is null or st is null or et is null or et<=st or periods not between 1 and 20 then raise exception 'Ngày, giờ hoặc số tiết không hợp lệ'; end if;
 sid:=public.create_my_school(r->>'school_name');
 if exists(select 1 from class_sessions where teacher_id=auth.uid() and session_date=d and start_time=st and end_time=et and school_id=sid and class_name=trim(r->>'class_name')) then skipped:=skipped+1; continue; end if;
 if exists(select 1 from class_sessions where teacher_id=auth.uid() and session_date=d and start_time<et and end_time>st) then raise exception 'Lịch bị trùng giờ ngày % lúc %',d,st; end if;
 select id into cid from classes where school_id=sid and class_name=trim(r->>'class_name') order by created_at limit 1;
 if cid is null then
 insert into classes(school_id,class_name,registration_code,created_by) values(sid,trim(r->>'class_name'),'IC3-'||upper(gen_random_uuid()::text),auth.uid()) returning id into cid;
 end if;
 insert into class_sessions(school_id,class_id,class_name,session_date,start_time,end_time,teacher_id,teacher_name,period_count,created_by)
 values(sid,cid,trim(r->>'class_name'),d,st,et,auth.uid(),teacher,periods,auth.uid()); n:=n+1;
 end loop;
 return jsonb_build_object('created',n,'skipped',skipped);
end $$;

revoke all on function public.admin_update_account(uuid,text,boolean,text),public.create_my_school(text),public.import_timetable(jsonb) from public,anon;
grant execute on function public.admin_update_account(uuid,text,boolean,text),public.create_my_school(text),public.import_timetable(jsonb) to authenticated;
revoke all on function public.handle_new_user(),public.check_school_references() from public,anon,authenticated;
revoke insert,update,delete on public.profiles,public.schools,public.school_members from anon,authenticated;
grant select on public.profiles,public.schools,public.school_members to authenticated;

create table if not exists public.timetable_quotas(user_id uuid primary key references public.profiles(id) on delete cascade, day date not null, calls integer not null);
alter table public.timetable_quotas enable row level security;
revoke all on public.timetable_quotas from anon,authenticated;
create or replace function public.consume_timetable_quota() returns void language plpgsql security definer set search_path=public as $$
declare used integer; begin
 if not public.is_staff() then raise exception 'Chưa được cấp quyền'; end if;
 insert into timetable_quotas(user_id,day,calls) values(auth.uid(),current_date,1)
 on conflict(user_id) do update set day=current_date,calls=case when timetable_quotas.day=current_date then timetable_quotas.calls+1 else 1 end returning calls into used;
 if used>20 then raise exception 'Đã đạt giới hạn 20 lần đọc ảnh/ngày'; end if;
end $$;
revoke all on function public.consume_timetable_quota() from public,anon;
grant execute on function public.consume_timetable_quota() to authenticated;
revoke all on function public.is_admin(),public.is_staff(),public.my_school_id(),public.can_access_school(uuid) from public,anon;
grant execute on function public.is_admin(),public.is_staff(),public.can_access_school(uuid) to authenticated;
create index if not exists school_members_user_idx on public.school_members(user_id);
create index if not exists class_sessions_teacher_date_idx on public.class_sessions(teacher_id,session_date);
do $$ declare t text; begin
 foreach t in array array['classes','students','computer_assignments','class_sessions','attendance','student_records','cleaning_logs','student_evaluations'] loop
 execute format('create index if not exists %I on public.%I(school_id)',t||'_school_idx',t);
 end loop;
end $$;
commit;
