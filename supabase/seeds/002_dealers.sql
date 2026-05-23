-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Seed 002: Staff Users + Dealers
-- Run AFTER migration 003_dealers_table.sql
-- ═══════════════════════════════════════════════════════════════
-- Creates 3 staff users, then 18 dealers assigned across them.
-- Credentials (all staff):
--   ramesh.sharma@beejsetu.com  | rameshsharma  | Staff@123
--   vijay.patel@beejsetu.com    | vijaypatel    | Staff@123
--   suresh.kumar@beejsetu.com   | sureshkumar   | Staff@123
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  staff1_id UUID := gen_random_uuid();
  staff2_id UUID := gen_random_uuid();
  staff3_id UUID := gen_random_uuid();
BEGIN

  -- ── Staff 1: Ramesh Sharma ───────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ramesh.sharma@beejsetu.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      staff1_id, '00000000-0000-0000-0000-000000000000',
      'ramesh.sharma@beejsetu.com', crypt('Staff@123', gen_salt('bf')),
      NOW(), '{"provider":"email","providers":["email"]}',
      '{"name":"Ramesh Sharma","role":"STAFF"}',
      'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''
    );
    INSERT INTO public.profiles (id, name, username, role)
    VALUES (staff1_id, 'Ramesh Sharma', 'rameshsharma', 'STAFF');
  ELSE
    SELECT id INTO staff1_id FROM auth.users WHERE email = 'ramesh.sharma@beejsetu.com';
  END IF;

  -- ── Staff 2: Vijay Patel ─────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'vijay.patel@beejsetu.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      staff2_id, '00000000-0000-0000-0000-000000000000',
      'vijay.patel@beejsetu.com', crypt('Staff@123', gen_salt('bf')),
      NOW(), '{"provider":"email","providers":["email"]}',
      '{"name":"Vijay Patel","role":"STAFF"}',
      'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''
    );
    INSERT INTO public.profiles (id, name, username, role)
    VALUES (staff2_id, 'Vijay Patel', 'vijaypatel', 'STAFF');
  ELSE
    SELECT id INTO staff2_id FROM auth.users WHERE email = 'vijay.patel@beejsetu.com';
  END IF;

  -- ── Staff 3: Suresh Kumar ────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'suresh.kumar@beejsetu.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      staff3_id, '00000000-0000-0000-0000-000000000000',
      'suresh.kumar@beejsetu.com', crypt('Staff@123', gen_salt('bf')),
      NOW(), '{"provider":"email","providers":["email"]}',
      '{"name":"Suresh Kumar","role":"STAFF"}',
      'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''
    );
    INSERT INTO public.profiles (id, name, username, role)
    VALUES (staff3_id, 'Suresh Kumar', 'sureshkumar', 'STAFF');
  ELSE
    SELECT id INTO staff3_id FROM auth.users WHERE email = 'suresh.kumar@beejsetu.com';
  END IF;

  -- ── Dealers: Ramesh Sharma (Saurashtra / North Gujarat) ──────
  INSERT INTO public.dealers (name, staff_id, contact, default_transport, default_delivery_instruction, territory, status) VALUES
    ('Patel Beej Bhandar',      staff1_id, '9824011234', 'VRL Logistics',  'Deliver before 10am, contact dealer before dispatch', 'Saurashtra',    'ACTIVE'),
    ('Sharma Krishi Kendra',    staff1_id, '9824022345', 'DTDC',           'Handle fragile packets carefully',                   'Saurashtra',    'ACTIVE'),
    ('Trivedi Seeds & Agro',    staff1_id, '9825033456', 'VRL Logistics',  'Deliver to warehouse, call on arrival',               'North Gujarat', 'ACTIVE'),
    ('Desai Agro Suppliers',    staff1_id, '9825044567', 'BlueDart',       'Weekday delivery only',                               'North Gujarat', 'ACTIVE'),
    ('Joshi Nursery & Seeds',   staff1_id, '9825055678', 'Delhivery',      'Leave with security if dealer unavailable',           'North Gujarat', 'ACTIVE'),
    ('Panchal Farm Inputs',     staff1_id, '9826066789', 'VRL Logistics',  'Deliver to farm directly, not shop',                  'Saurashtra',    'INACTIVE');

  -- ── Dealers: Vijay Patel (South Gujarat / West MP) ───────────
  INSERT INTO public.dealers (name, staff_id, contact, default_transport, default_delivery_instruction, territory, status) VALUES
    ('Mehta Beej Sangh',        staff2_id, '9724011234', 'Rivigo',         'Call 1 hour before delivery',                        'South Gujarat', 'ACTIVE'),
    ('Bhatt Krishi Seva',       staff2_id, '9724022345', 'VRL Logistics',  'Deliver to main branch only',                        'South Gujarat', 'ACTIVE'),
    ('Shah Agri Centre',        staff2_id, '9725033456', 'DTDC',           'Coordinate with store manager Ashok',                'South Gujarat', 'ACTIVE'),
    ('Raval Seeds Pvt Ltd',     staff2_id, '9725044567', 'BlueDart',       'Invoice must be signed on delivery',                  'West MP',       'ACTIVE'),
    ('Nayak Agro Industries',   staff2_id, '9725055678', 'Delhivery',      'Morning delivery preferred, before 9am',              'West MP',       'ACTIVE'),
    ('Thakkar Farmers Hub',     staff2_id, '9726066789', 'Rivigo',         'Cold storage facility available on site',             'South Gujarat', 'SUSPENDED');

  -- ── Dealers: Suresh Kumar (Rajasthan / Vidarbha) ─────────────
  INSERT INTO public.dealers (name, staff_id, contact, default_transport, default_delivery_instruction, territory, status) VALUES
    ('Gupta Beej Udyog',        staff3_id, '9414011234', 'VRL Logistics',  'Deliver to back gate, ask for Raju',                  'East Rajasthan','ACTIVE'),
    ('Verma Kisan Store',       staff3_id, '9414022345', 'DTDC',           'Fragile — seeds must stay upright',                  'East Rajasthan','ACTIVE'),
    ('Shrivastava Agro Mart',   staff3_id, '9415033456', 'Rivigo',         'Call Suresh bhai on 9415033456 before dispatch',      'Vidarbha',      'ACTIVE'),
    ('Tiwari Seeds & Pesticides',staff3_id,'9415044567', 'BlueDart',       'Deliver only on Tuesdays and Fridays',                'Vidarbha',      'ACTIVE'),
    ('Yadav Krishi Bhandar',    staff3_id, '9415055678', 'Delhivery',      'Do not leave unattended, requires signature',         'East Rajasthan','ACTIVE'),
    ('Pandey Farm Supplies',    staff3_id, '9416066789', 'VRL Logistics',  'New dealer — confirm address before each dispatch',   'Vidarbha',      'ACTIVE');

  RAISE NOTICE 'Seed 002: 3 staff users and 18 dealers created successfully.';

END $$;
