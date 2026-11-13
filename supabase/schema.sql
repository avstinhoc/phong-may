-- IC3 GS6 Computer Lab schema
-- Chạy toàn bộ file này trong Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  school_id uuid references public.schools(id) on delete set null,
  school_name text,
  role text not null default 'pending' check (role in ('pending','admin','teacher','student','staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  class_name text not null,
  registration_code text not null unique,
  student_fee_per_period numeric(12,2) not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  full_name text not null,
  student_code text,
  class_name text,
  school_name text,
  phone text,
  date_of_birth date,
  status text not null default 'pending' check (status in ('pending','active','inactive','rejected')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.computers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  computer_code text not null,
  location text default 'Phòng máy 1',
  status text not null default 'available' check (status in ('available','occupied','maintenance','broken')),
  capacity integer not null default 2 check (capacity between 1 and 2),
  created_at timestamptz not null default now(),
  unique(school_id,computer_code)
);

create table if not exists public.computer_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  computer_id uuid references public.computers(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  assigned_date date not null default current_date,
  released_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  class_name text not null,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  teacher_id uuid references public.profiles(id),
  teacher_name text,
  hourly_rate numeric(12,2) not null default 0,
  student_fee_per_period numeric(12,2) not null default 0,
  period_count integer not null default 1,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  session_id uuid references public.class_sessions(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  status text not null default 'present' check (status in ('present','absent','late','excused')),
  check_in timestamptz,
  check_out timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.student_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  record_type text not null check (record_type in ('point','reward','violation')),
  title text not null,
  points numeric(8,2) not null default 0,
  note text,
  record_date date not null default current_date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.cleaning_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  computer_id uuid references public.computers(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  cleaning_date date not null default current_date,
  status text not null default 'done' check (status in ('done','not_done')),
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.student_evaluations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  period_label text,
  level text,
  comment text,
  metrics jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.student_registrations (
  id uuid primary key default gen_random_uuid(),
  registration_code text not null references public.classes(registration_code) on update cascade,
  full_name text not null,
  student_code text,
  phone text,
  computer_code text,
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- Helper: school scope. A user only sees records for their own school.
create or replace function public.my_school_id()
returns uuid language sql stable security definer set search_path = public
as $$ select school_id from public.profiles where id = auth.uid() $$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','teacher','staff')) $$;

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.computers enable row level security;
alter table public.computer_assignments enable row level security;
alter table public.class_sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.student_records enable row level security;
alter table public.cleaning_logs enable row level security;
alter table public.student_evaluations enable row level security;
alter table public.student_registrations enable row level security;

-- Profiles: users can read/update their own profile; staff in same school can read profiles.
create policy "profile self read" on public.profiles for select using (id=auth.uid() or (public.is_staff() and school_id=public.my_school_id()));
create policy "profile self insert" on public.profiles for insert with check (id=auth.uid() and role='pending');
-- Không cho người dùng tự sửa role hoặc school_id từ trình duyệt.
-- Quản trị viên cấp quyền bằng SQL/luồng quản trị an toàn ở phía server.

-- Generic school-scoped policies for operational tables.
do $$
declare t text;
begin
 foreach t in array array['classes','students','computers','computer_assignments','class_sessions','attendance','student_records','cleaning_logs','student_evaluations'] loop
   execute format('create policy %I on public.%I for select using (school_id=public.my_school_id())', t||'_read_school',t);
   execute format('create policy %I on public.%I for insert with check (public.is_staff() and school_id=public.my_school_id())', t||'_staff_insert',t);
   execute format('create policy %I on public.%I for update using (public.is_staff() and school_id=public.my_school_id()) with check (public.is_staff() and school_id=public.my_school_id())', t||'_staff_update',t);
   execute format('create policy %I on public.%I for delete using (public.is_staff() and school_id=public.my_school_id())', t||'_staff_delete',t);
 end loop;
end $$;

create policy "schools read own" on public.schools for select using (id=public.my_school_id());
create policy "registration public submit" on public.student_registrations for insert with check (true);
create policy "registration staff read" on public.student_registrations for select using (public.is_staff() and exists(select 1 from public.classes c where c.registration_code=student_registrations.registration_code and c.school_id=public.my_school_id()));
create policy "registration staff update" on public.student_registrations for update using (public.is_staff() and exists(select 1 from public.classes c where c.registration_code=student_registrations.registration_code and c.school_id=public.my_school_id()));

-- IMPORTANT FIRST-TIME ADMIN SETUP:
-- 1) Create a user through the app's teacher registration.
-- 2) Insert a school row.
-- 3) In SQL Editor, set that user's profile role/school_id:
-- update public.profiles set role='admin', school_id='SCHOOL_UUID', school_name='Tên trường' where email='your@email';
-- Never expose service_role key in the browser.
