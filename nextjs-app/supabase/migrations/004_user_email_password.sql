-- Add email/password and verification fields to users

alter table users
  add column if not exists email text unique,
  add column if not exists password_hash text,
  add column if not exists email_verified_at timestamptz,
  add column if not exists verification_code text,
  add column if not exists verification_expires timestamptz;

create index if not exists idx_users_email on users(email);
