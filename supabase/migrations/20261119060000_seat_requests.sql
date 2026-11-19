create table public.seat_change_requests(
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.schools on delete cascade,
 class_id uuid not null references public.classes on delete cascade,
 student_id uuid not null references public.students on delete cascade,
 previous_assignment uuid,
 computer_id uuid not null references public.computers on delete cascade,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid
);
create unique index one_pending_seat_change on public.seat_change_requests(student_id) where status='pending';
alter table public.seat_change_requests enable row level security;
revoke all on public.seat_change_requests from anon,authenticated;
grant select on public.seat_change_requests to authenticated;
create policy teacher_seat_requests on public.seat_change_requests for select to authenticated using(
 public.can_access_school(school_id) and exists(select 1 from public.profiles where id=auth.uid() and is_active and role in ('teacher','staff','admin'))
);
create function public.request_seat_change(p_code text,p_secret text,p_pc text) returns void
language plpgsql security definer set search_path='' as $$
declare c public.classes; s public.students; pc uuid; prev public.computer_assignments;
 token text:=regexp_replace(upper(p_secret),'[^A-Z0-9]','','g');
begin
 select * into c from public.classes where registration_code=public.ic3_resolve_class_code(p_code) and archived_at is null;
 select st.* into s from public.students st join public.student_portal_tokens t on t.student_id=st.id
 where st.school_id=c.school_id and st.status='active' and (st.class_id=c.id or (st.class_id is null and st.class_name=c.class_name))
 and length(token) in (12,48) and t.token_hash=encode(extensions.digest(case when length(token)=48 then lower(token) else token end,'sha256'),'hex') for update of st;
 if s.id is null then raise exception 'Kiểm tra mã cá nhân và mã lớp.'; end if;
 select id into pc from public.computers where school_id=c.school_id and computer_code=p_pc and status not in ('broken','maintenance');
 select * into prev from public.computer_assignments where student_id=s.id and active;
 if pc is null or pc=prev.computer_id then raise exception 'Hãy chọn máy khác đang sử dụng được.'; end if;
 insert into public.seat_change_requests(school_id,class_id,student_id,computer_id,previous_assignment)
 values(c.school_id,c.id,s.id,pc,prev.id);
 exception when unique_violation then raise exception 'Đã có yêu cầu đang chờ duyệt.';
end $$;
create function public.review_seat_change(p_id uuid,p_approve boolean) returns void
language plpgsql security definer set search_path='' as $$
declare r public.seat_change_requests; prev uuid;
begin
 select * into r from public.seat_change_requests where id=p_id for update;
 if r.status is distinct from 'pending' or not public.can_access_school(r.school_id) or not exists(
 select from public.profiles where id=auth.uid() and is_active and role in ('teacher','admin','staff')) then raise exception 'Yêu cầu không khả dụng.'; end if;
 if p_approve then
 perform 1 from public.students s join public.classes c on c.id=r.class_id and c.school_id=s.school_id
 where s.id=r.student_id and s.school_id=r.school_id and s.status='active' and c.archived_at is null
 and (s.class_id=c.id or (s.class_id is null and s.class_name=c.class_name)) for update of s,c;
 if not found then raise exception 'Học sinh đã chuyển lớp hoặc lớp đã đóng.'; end if;
 select id into prev from public.computer_assignments where student_id=r.student_id and active for update;
 if prev is distinct from r.previous_assignment then raise exception 'Chỗ ngồi đã thay đổi, hãy từ chối yêu cầu cũ.'; end if;
 update public.computer_assignments set active=false,released_at=now() where id=prev;
 -- Existing check_class_seat locks the destination, checks school, health and per-class capacity.
 insert into public.computer_assignments(school_id,computer_id,student_id) values(r.school_id,r.computer_id,r.student_id);
 end if;
 update public.seat_change_requests set status=case when p_approve then 'approved' else 'rejected' end,reviewed_at=now(),reviewed_by=auth.uid() where id=r.id;
end $$;
revoke all on function public.request_seat_change(text,text,text),public.review_seat_change(uuid,boolean) from public,anon,authenticated;
grant execute on function public.request_seat_change(text,text,text) to anon,authenticated;
grant execute on function public.review_seat_change(uuid,boolean) to authenticated;

-- Serialize inserts from simultaneous roster syncs for the same class.
create function public.ic3_import_sheet_student(p_class uuid,p_name text,p_birth date,p_phone text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare c public.classes; new_id uuid;
begin
 select * into c from public.classes where id=p_class and archived_at is null for update;
 if c.id is null or not public.can_access_school(c.school_id) then raise exception 'Lớp không khả dụng.'; end if;
 if p_name is null or length(trim(p_name)) not between 2 and 150 then raise exception 'Tên học sinh không hợp lệ.'; end if;
 if exists(select from public.students where school_id=c.school_id and class_name=c.class_name
 and lower(regexp_replace(trim(full_name),'\s+',' ','g'))=lower(regexp_replace(trim(p_name),'\s+',' ','g'))) then
 raise exception 'Tên đã xuất hiện trong lớp. Hãy đối chiếu lại.'; end if;
 insert into public.students(school_id,class_id,class_name,full_name,school_name,date_of_birth,phone,created_by,status)
 values(c.school_id,c.id,c.class_name,trim(p_name),(select name from public.schools where id=c.school_id),p_birth,p_phone,auth.uid(),'active') returning id into new_id;
 return new_id;
end $$;
revoke all on function public.ic3_import_sheet_student(uuid,text,date,text) from public,anon;
grant execute on function public.ic3_import_sheet_student(uuid,text,date,text) to authenticated;
