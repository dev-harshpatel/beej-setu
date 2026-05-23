-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 007: Drop payment fields from orders
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS payment_status,
  DROP COLUMN IF EXISTS payment_method;
