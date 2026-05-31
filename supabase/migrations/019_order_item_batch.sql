-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 019: order_items column additions
--
-- 1. batch_number / batch_change_reason — lets admin assign a
--    stock batch during approval; dispatch can override it with
--    a reason when creating the challan.
--
-- 2. requested_quantity — stores the originally requested qty
--    so that partial approvals can track how much was reduced.
--    This column was added directly in Supabase Studio and was
--    missing from the migration history; it is included here
--    with IF NOT EXISTS so re-running is safe.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS batch_number        TEXT,
  ADD COLUMN IF NOT EXISTS batch_change_reason TEXT,
  ADD COLUMN IF NOT EXISTS requested_quantity  INTEGER;

-- Back-fill existing rows: before partial approvals existed,
-- requested_quantity and quantity were always the same.
UPDATE public.order_items
  SET requested_quantity = quantity
  WHERE requested_quantity IS NULL;
