-- QLPM Google OAuth 2.0: no plaintext refresh tokens or user-readable OAuth states.
create table if not exists public.google_drive_connections (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  google_email text,
  refresh_token_ciphertext text not null,
  refresh_token_iv text not null,
  scopes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.google_oauth_states (
  state_hash text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  code_verifier text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists google_oauth_states_expiry_idx on public.google_oauth_states(expires_at);
alter table public.google_drive_connections enable row level security;
alter table public.google_oauth_states enable row level security;
-- No RLS policies: only the server-side service role can read/update rows.
revoke all privileges on public.google_drive_connections from public,anon,authenticated;
revoke all privileges on public.google_oauth_states from public,anon,authenticated;
grant all privileges on public.google_drive_connections to service_role;
grant all privileges on public.google_oauth_states to service_role;
comment on table public.google_drive_connections is 'AES-256-GCM encrypted Google OAuth offline refresh tokens, service_role only';
comment on table public.google_oauth_states is 'One-time OAuth state with PKCE verifier, service_role only; expire within 10 minutes';
