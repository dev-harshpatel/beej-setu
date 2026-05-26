-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 017: Prevent duplicate stock deduction on re-approval
-- Run in: Supabase SQL editor (Project → SQL Editor → New query)
--
-- Problem: approve_order() deducted stock every time it was called,
--          so toggling HOLD → APPROVED multiple times created multiple
--          DISPATCH entries and over-deducted seed_stock.
--
-- Fix: Skip deduction if DISPATCH movements already exist for this order.
--      Also undo duplicate deductions from the existing bad data.
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- Step 1: Fix approve_order — skip deduction if already dispatched
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_order(
  p_order_id UUID,
  p_status   TEXT DEFAULT 'APPROVED'
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_item      RECORD;
  v_staff_id  UUID;
  v_already_deducted BOOLEAN;
BEGIN
  IF p_status NOT IN ('APPROVED', 'PARTIALLY_APPROVED') THEN
    RAISE EXCEPTION 'approve_order() only accepts APPROVED or PARTIALLY_APPROVED, got: %', p_status;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id AND status IN ('PENDING', 'HOLD')
  ) THEN
    RAISE EXCEPTION 'Order % must be PENDING or HOLD to approve (current status is not eligible)', p_order_id;
  END IF;

  -- Check if stock was already deducted for this order in a previous approval
  SELECT EXISTS (
    SELECT 1 FROM public.stock_movements
    WHERE order_id = p_order_id AND movement_type = 'DISPATCH'
  ) INTO v_already_deducted;

  IF NOT v_already_deducted THEN
    SELECT staff_id INTO v_staff_id FROM public.orders WHERE id = p_order_id;

    FOR v_item IN
      SELECT seed_id, quantity, unit
      FROM public.order_items
      WHERE order_id = p_order_id
    LOOP
      PERFORM public.deduct_seed_stock(
        v_item.seed_id,
        v_item.quantity,
        v_item.unit,
        p_order_id,
        v_staff_id,
        auth.uid()
      );
    END LOOP;
  END IF;

  UPDATE public.orders
    SET status = p_status, updated_at = NOW()
    WHERE id = p_order_id;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- Step 2: Fix existing bad data — remove duplicate DISPATCH entries
--
-- For each order+seed combination, keep only the FIRST DISPATCH movement
-- (the original correct one) and delete the duplicates.
-- Then restore seed_stock to reflect the correct single deduction.
-- ──────────────────────────────────────────────────────────────

-- 2a: Delete duplicate DISPATCH rows (keep the earliest per order+seed+batch)
DELETE FROM public.stock_movements
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY order_id, seed_id, batch_number
        ORDER BY created_at ASC
      ) AS rn
    FROM public.stock_movements
    WHERE movement_type = 'DISPATCH'
      AND order_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- 2b: Recompute seed_stock from the now-corrected stock_movements ledger
SELECT set_config('app.in_deduction', 'true', true);

WITH ledger_balance AS (
  SELECT
    sm.seed_id,
    sm.batch_number,
    GREATEST(0,
      SUM(CASE WHEN sm.movement_type IN ('ADD', 'ADJUSTMENT_IN')
               THEN  sm.quantity_packets
               ELSE -sm.quantity_packets
          END)
    ) AS net_packets
  FROM public.stock_movements sm
  GROUP BY sm.seed_id, sm.batch_number
),
with_ppb AS (
  SELECT
    lb.seed_id,
    lb.batch_number,
    lb.net_packets,
    sp.packets_per_bag,
    FLOOR(lb.net_packets::NUMERIC / sp.packets_per_bag)::INTEGER AS new_bags,
    (lb.net_packets % sp.packets_per_bag)::INTEGER                AS new_pkts
  FROM ledger_balance lb
  JOIN public.seed_products sp ON sp.id = lb.seed_id
)
INSERT INTO public.seed_stock (seed_id, batch_number, bag_stock, packet_stock)
SELECT seed_id, batch_number, new_bags, new_pkts
FROM with_ppb
ON CONFLICT (seed_id, batch_number) DO UPDATE
  SET bag_stock    = EXCLUDED.bag_stock,
      packet_stock = EXCLUDED.packet_stock,
      updated_at   = NOW();

SELECT set_config('app.in_deduction', 'false', true);
