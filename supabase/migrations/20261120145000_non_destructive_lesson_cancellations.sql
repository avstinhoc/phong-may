-- Mark school holidays / cancelled teaching sessions without removing class_sessions
-- or the attendance rows already attached to them.
alter table public.class_sessions
  add column if not exists is_cancelled boolean not null default false;
alter table public.class_sessions
  add column if not exists cancel_reason text not null default '';

comment on column public.class_sessions.is_cancelled is
  'True for a planned session that did not take place; exclude from attendance/payroll totals.';
comment on column public.class_sessions.cancel_reason is
  'Optional teacher-entered reason for lesson cancellation, e.g. Ngày Nhà giáo Việt Nam.';
