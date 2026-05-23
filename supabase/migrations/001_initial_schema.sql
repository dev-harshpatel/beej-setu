-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 001: Profiles + Seeded Users
-- Run in: Supabase SQL editor (Project → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════
-- There is NO signup flow. All users are created by admins.
-- Initial users are seeded below.
-- ═══════════════════════════════════════════════════════════════

-- pgcrypto is required for crypt() used to hash passwords.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ──────────────────────────────────────────────────────────────
-- Helper: auto-update updated_at on any table
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- Table: profiles
-- Extends auth.users with role, username and business fields.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id             UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name           TEXT NOT NULL,
  username       TEXT NOT NULL UNIQUE,
  phone          TEXT,
  role           TEXT NOT NULL DEFAULT 'STAFF'
                   CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'STAFF')),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  profile_image  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ──────────────────────────────────────────────────────────────
-- RLS: profiles
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE POLICY "profiles_select_own"    ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_select_admin"  ON public.profiles FOR SELECT USING (get_my_role() IN ('SUPER_ADMIN','ADMIN'));
CREATE POLICY "profiles_update_own"    ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_update_admin"  ON public.profiles FOR UPDATE USING (get_my_role() IN ('SUPER_ADMIN','ADMIN'));

-- ──────────────────────────────────────────────────────────────
-- Seed: auth users + profiles
--
-- Credentials:
--   1. hp673315@gmail.com  | username: harshpatel    | Harsh@178   | SUPER_ADMIN
--   2. pnpatel.333@gmail.com | username: prakashpatel | Rp@921975  | ADMIN
-- ──────────────────────────────────────────────────────────────

DO $$
DECLARE
  user1_id UUID := gen_random_uuid();
  user2_id UUID := gen_random_uuid();
BEGIN

  -- ── User 1: Harsh Patel ──────────────────────────────────────
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
    user1_id,
    '00000000-0000-0000-0000-000000000000',
    'hp673315@gmail.com',
    crypt('Harsh@178', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Harsh Patel","role":"SUPER_ADMIN"}',
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '', '', '', ''
  );

  INSERT INTO public.profiles (id, name, username, role)
  VALUES (user1_id, 'Harsh Patel', 'harshpatel', 'SUPER_ADMIN');

  -- ── User 2: Prakash Patel ────────────────────────────────────
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
    user2_id,
    '00000000-0000-0000-0000-000000000000',
    'pnpatel.333@gmail.com',
    crypt('Rp@921975', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Prakash Patel","role":"ADMIN"}',
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '', '', '', ''
  );

  INSERT INTO public.profiles (id, name, username, role)
  VALUES (user2_id, 'Prakash Patel', 'prakashpatel', 'ADMIN');

END $$;
