-- Table privileges and RLS are complementary. Never grant TRUNCATE to API roles.
revoke all on public.students,public.computers,public.computer_assignments,public.classes,public.class_sessions,public.attendance,public.student_records,public.cleaning_logs,public.student_evaluations,public.student_registrations from anon,authenticated;
grant usage on schema public to anon,authenticated;
grant select,insert,update,delete on public.students,public.computers,public.computer_assignments,public.classes,public.class_sessions,public.attendance,public.student_records,public.cleaning_logs,public.student_evaluations to authenticated;
grant insert on public.student_registrations to anon,authenticated;
grant select,update on public.student_registrations to authenticated;
revoke truncate,references,trigger on public.profiles,public.schools,public.school_members from anon,authenticated;
create or replace function public.seed_school_computers() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.computers(school_id,computer_code) select new.id,'PC'||n from generate_series(1,40) n on conflict(school_id,computer_code) do nothing;
 return new;
end $$;
revoke all on function public.seed_school_computers() from public,anon,authenticated;
drop trigger if exists seed_computers on public.schools;
create trigger seed_computers after insert on public.schools for each row execute function public.seed_school_computers();
insert into public.computers(school_id,computer_code) select s.id,'PC'||n from public.schools s cross join generate_series(1,40) n on conflict(school_id,computer_code) do nothing;
