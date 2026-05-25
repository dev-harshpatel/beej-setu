-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Seed 005: Dispatch Staff User
-- Run AFTER migration 010_dispatch_staff.sql
-- ═══════════════════════════════════════════════════════════════
-- Creates 1 dispatch staff user.
-- Credentials:
--   rajpatel@gmail.com  |  username: rajpatel  |  password: rajpatel
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  dispatch_id UUID := gen_random_uuid();
BEGIN

  -- ── Dispatch Staff: Raj Patel ────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'rajpatel@gmail.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      dispatch_id,
      '00000000-0000-0000-0000-000000000000',
      'rajpatel@gmail.com',
      crypt('rajpatel', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Raj Patel","role":"DISPATCH_STAFF"}',
      'authenticated',
      'authenticated',
      NOW(), NOW(), '', '', '', ''
    );

    INSERT INTO public.profiles (id, name, username, role)
    VALUES (dispatch_id, 'Raj Patel', 'rajpatel', 'DISPATCH_STAFF');

    RAISE NOTICE 'Created dispatch staff: rajpatel@gmail.com (rajpatel / rajpatel)';
  ELSE
    RAISE NOTICE 'User rajpatel@gmail.com already exists — skipping.';
  END IF;

END $$;
