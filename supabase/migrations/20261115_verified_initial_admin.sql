begin;
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create table if not exists private.initial_admin_claims (
 email text primary key check(email=lower(trim(email))),
 claimed_by uuid references auth.users(id),
 claimed_at timestamptz
);
alter table private.initial_admin_claims enable row level security;
revoke all on private.initial_admin_claims from public,anon,authenticated;
create or replace function private.activate_initial_admin()
returns trigger language plpgsql security definer set search_path=public,private as $$
declare claim_email text;
begin
 if new.email_confirmed_at is null or new.email is null then return new; end if;
 select email into claim_email from private.initial_admin_claims
 where email=lower(trim(new.email)) and claimed_at is null for update;
 if claim_email is null then return new; end if;
 update public.profiles set role='admin',is_active=true where id=new.id;
 if found then
 update private.initial_admin_claims set claimed_by=new.id,claimed_at=now() where email=claim_email;
 end if;
 return new;
end $$;
revoke all on function private.activate_initial_admin() from public,anon,authenticated;
drop trigger if exists zz_activate_initial_admin on auth.users;
create trigger zz_activate_initial_admin after insert or update of email_confirmed_at on auth.users for each row execute function private.activate_initial_admin();
commit;
