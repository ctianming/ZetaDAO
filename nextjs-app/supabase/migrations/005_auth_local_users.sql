-- Local email/password accounts for users without wallet binding

create table if not exists auth_local_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  username text unique,
  password_hash text not null,
  email_verified_at timestamptz,
  verification_code text,
  verification_expires timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_auth_local_users_email on auth_local_users(email);
create index if not exists idx_auth_local_users_username on auth_local_users(username);

create or replace function set_updated_at_auth_local()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_auth_local_users_updated
before update on auth_local_users
for each row execute function set_updated_at_auth_local();
