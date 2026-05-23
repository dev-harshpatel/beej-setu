-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Seed 001: Super Admin (Tanmay Patel)
-- Run in: Supabase SQL Editor (Project → SQL Editor → New query)
--
-- Credentials:
--   Email    : Tanmay17@gmail.com
--   Username : tanmaypatel
--   Password : tanmaypatel
--   Role     : SUPER_ADMIN
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  user_id UUID := gen_random_uuid();
BEGIN

  -- Skip if this email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'Tanmay17@gmail.com') THEN
    RAISE NOTICE 'User Tanmay17@gmail.com already exists — skipping.';
    RETURN;
  END IF;

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    user_id,
    '00000000-0000-0000-0000-000000000000',
    'Tanmay17@gmail.com',
    crypt('tanmaypatel', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Tanmay Patel","role":"SUPER_ADMIN"}',
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '', '', '', ''
  );

  INSERT INTO public.profiles (id, name, username, role)
  VALUES (user_id, 'Tanmay Patel', 'tanmaypatel', 'SUPER_ADMIN');

  RAISE NOTICE 'Super admin Tanmay Patel created with id %', user_id;

END $$;
