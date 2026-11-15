create or replace function public.normalize_student_name() returns trigger language plpgsql set search_path=public as $$
begin new.full_name:=initcap(regexp_replace(trim(new.full_name),'\s+',' ','g')); return new; end $$;
revoke all on function public.normalize_student_name() from public,anon,authenticated;
drop trigger if exists normalize_name on public.students;
create trigger normalize_name before insert or update of full_name on public.students for each row execute function public.normalize_student_name();
drop trigger if exists normalize_name on public.student_registrations;
create trigger normalize_name before insert or update of full_name on public.student_registrations for each row execute function public.normalize_student_name();

-- Seating belongs to a student's class; physical machine health is shared by school.
create or replace function public.check_class_seat() returns trigger language plpgsql security definer set search_path=public as $$
declare pc computers; pupil students; used integer;
begin
 if not new.active then return new; end if;
 select * into pc from computers where id=new.computer_id for update;
 select * into pupil from students where id=new.student_id;
 if pc.school_id is distinct from new.school_id or pupil.school_id is distinct from new.school_id then raise exception 'Máy và học sinh phải cùng trường'; end if;
 if coalesce(trim(pupil.class_name),'')='' then raise exception 'Hãy nhập lớp cho học sinh trước khi gán máy'; end if;
 if pc.status in ('broken','maintenance') then raise exception 'Máy đang hỏng hoặc bảo trì'; end if;
 if exists(select 1 from computer_assignments where student_id=new.student_id and active and id<>new.id) then raise exception 'Học sinh đã có máy. Gỡ máy cũ trước khi đổi.'; end if;
 select count(*) into used from computer_assignments a join students s on s.id=a.student_id
 where a.computer_id=new.computer_id and a.active and a.id<>new.id
 and ((pupil.class_id is not null and s.class_id is not null and s.class_id=pupil.class_id) or ((pupil.class_id is null or s.class_id is null) and s.class_name=pupil.class_name));
 if used>=pc.capacity then raise exception 'Máy đã đủ chỗ trong lớp này'; end if;
 return new;
end $$;
revoke all on function public.check_class_seat() from public,anon,authenticated;
drop trigger if exists check_class_seat on public.computer_assignments;
create trigger check_class_seat before insert or update on public.computer_assignments for each row execute function public.check_class_seat();

create table if not exists public.student_results (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
 student_id uuid not null unique references public.students(id) on delete cascade,
 gender text not null default '', classification text not null default '', scores jsonb not null default '{}',
 comment text not null default '', standard_met boolean not null default false, exam_result text not null default '',
 updated_at timestamptz not null default now()
);
alter table public.student_results enable row level security;
revoke all on public.student_results from anon,authenticated;
grant select,insert,update,delete on public.student_results to authenticated;
drop policy if exists school_access on public.student_results;
create policy school_access on public.student_results for all to authenticated using(public.can_access_school(school_id)) with check(public.can_access_school(school_id));
drop trigger if exists check_school_references on public.student_results;
create trigger check_school_references before insert or update on public.student_results for each row execute function public.check_school_references();
create index if not exists student_results_school on public.student_results(school_id);

create or replace function public.approve_registration(registration_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare r student_registrations; c classes; p computers; sid uuid;
begin
 select * into r from student_registrations where id=registration_id for update;
 if not found or r.status <> 'pending' then raise exception 'Đăng ký không còn chờ duyệt'; end if;
 select * into c from classes where registration_code=r.registration_code;
 if not public.can_access_school(c.school_id) then raise exception 'Không có quyền duyệt lớp này'; end if;
 if nullif(trim(r.computer_code),'') is not null then
  select * into p from computers where school_id=c.school_id and computer_code=upper(trim(r.computer_code)) for update;
  if not found then raise exception 'Không tìm thấy máy đăng ký'; end if;
  if p.status in ('broken','maintenance') then raise exception 'Máy đang hỏng hoặc bảo trì. Đổi máy trước khi duyệt.'; end if;
  if (select count(*) from computer_assignments a join students s on s.id=a.student_id where a.computer_id=p.id and a.active and (s.class_id=c.id or (s.class_id is null and s.class_name=c.class_name))) >= p.capacity then raise exception 'Máy đã đủ chỗ. Đổi máy trước khi duyệt.'; end if;
 end if;
 insert into students(school_id,class_id,class_name,school_name,full_name,student_code,phone,status,created_by)
 values(c.school_id,c.id,c.class_name,(select name from schools where id=c.school_id),r.full_name,r.student_code,r.phone,'active',auth.uid()) returning id into sid;
 if p.id is not null then insert into computer_assignments(school_id,computer_id,student_id) values(c.school_id,p.id,sid); end if;
 update student_registrations set status='approved' where id=r.id;
 return sid;
end $$;
revoke all on function public.approve_registration(uuid) from public,anon;
grant execute on function public.approve_registration(uuid) to authenticated;

