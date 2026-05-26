-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 012: Add territory to profiles
--
-- Staff members are often dedicated to a specific territory.
-- Storing territory on the profile lets the dealer form auto-fill
-- when an assigned staff is selected.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS territory TEXT DEFAULT NULL;
