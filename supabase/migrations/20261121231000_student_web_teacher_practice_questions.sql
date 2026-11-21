-- School-scoped teacher-authored practice questions, isolated from global arcade rewards.
-- Publishing is an explicit teacher action; students receive only published questions.
create table if not exists public.student_web_practice_questions (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.schools(id),
 lesson integer not null check (lesson between 1 and 22),
 title text not null check (char_length(title) between 3 and 160),
 q text not null check (char_length(q) between 8 and 1200),
 choices text[] not null check (array_length(choices,1) between 2 and 6),
 solution text not null check (char_length(solution) between 1 and 600),
 why text not null default '',
 image_path text,
 alt text not null default '',
 published boolean not null default false,
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint valid_practice_answer check (solution=any(choices)),
 constraint safe_student_asset check (image_path is null or image_path ~ '^/ic3-(scenes|slides)/[a-zA-Z0-9_./-]+[.](png|webp|jpg|jpeg)$')
);
create index if not exists idx_student_web_practice_questions_school_lesson
  on public.student_web_practice_questions(school_id,lesson,published);
alter table public.student_web_practice_questions enable row level security;
revoke all on public.student_web_practice_questions from PUBLIC,anon,authenticated;
grant select,insert,update,delete on public.student_web_practice_questions to authenticated;
drop policy if exists practice_teacher_read on public.student_web_practice_questions;
create policy practice_teacher_read on public.student_web_practice_questions
for select to authenticated using (auth.uid() is not null and public.can_access_school(school_id));
drop policy if exists practice_teacher_insert on public.student_web_practice_questions;
create policy practice_teacher_insert on public.student_web_practice_questions
for insert to authenticated
with check (auth.uid() is not null and public.can_access_school(school_id) and created_by=auth.uid());
drop policy if exists practice_teacher_update on public.student_web_practice_questions;
create policy practice_teacher_update on public.student_web_practice_questions
for update to authenticated
using (auth.uid() is not null and public.can_access_school(school_id))
with check (auth.uid() is not null and public.can_access_school(school_id));
drop policy if exists practice_teacher_delete on public.student_web_practice_questions;
create policy practice_teacher_delete on public.student_web_practice_questions
for delete to authenticated using (auth.uid() is not null and public.can_access_school(school_id));

create or replace function public.qlpm_student_web_practice_questions(p_session_token text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_identity jsonb; v_school uuid;
begin
  v_identity:=public.qlpm_student_web_whoami(p_session_token);
  if v_identity is null then
    raise exception 'Phiên học sinh đã hết hạn, vui lòng đăng nhập lại.';
  end if;
  v_school:=(v_identity->>'school_id')::uuid;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',q.id::text,'lesson',q.lesson,'title',q.title,'q',q.q,
      'choices',q.choices,'solution',q.solution,'why',q.why,
      'image',q.image_path,'alt',q.alt
    ) order by q.lesson,q.created_at)
    from public.student_web_practice_questions q
    where q.school_id=v_school and q.published=true
  ),'[]'::jsonb);
end $$;
revoke all on function public.qlpm_student_web_practice_questions(text) from PUBLIC,anon,authenticated;
grant execute on function public.qlpm_student_web_practice_questions(text) to anon,authenticated;
