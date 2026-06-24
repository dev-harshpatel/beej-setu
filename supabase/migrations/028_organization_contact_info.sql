-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 028: Organization contact info
-- Run in: Supabase SQL editor (Project → SQL Editor → New query)
--
-- Adds address / GST number / phone to organizations so the
-- delivery challan PDF can print a proper company letterhead.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS address            TEXT,
  ADD COLUMN IF NOT EXISTS gst_number         TEXT,
  ADD COLUMN IF NOT EXISTS phone              TEXT,
  ADD COLUMN IF NOT EXISTS email              TEXT,
  ADD COLUMN IF NOT EXISTS seed_licence_number TEXT;
