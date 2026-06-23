-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 027: Allow zero quantity on order items
--
-- Admin must be able to set an item quantity to 0 during approval
-- (e.g. "we won't supply this item at all"). The only restriction
-- is non-negative. deduct_seed_stock() already handles 0 as a
-- no-op (v_to_deduct = 0, loop exits immediately).
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_quantity_check;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_quantity_check
  CHECK (quantity >= 0);
