-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 016: Allow approving orders from HOLD status
-- Run in: Supabase SQL editor (Project → SQL Editor → New query)
--
-- Problem: approve_order() required status = 'PENDING' as precondition.
--          Admins need to be able to approve orders that were put on HOLD
--          (PENDING → HOLD → APPROVED is a valid workflow).
--          HOLD orders have not had stock deducted yet, so deduction is safe.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.approve_order(
  p_order_id UUID,
  p_status   TEXT DEFAULT 'APPROVED'
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_item      RECORD;
  v_staff_id  UUID;
BEGIN
  IF p_status NOT IN ('APPROVED', 'PARTIALLY_APPROVED') THEN
    RAISE EXCEPTION 'approve_order() only accepts APPROVED or PARTIALLY_APPROVED, got: %', p_status;
  END IF;

  -- Accept PENDING or HOLD as valid source statuses.
  -- HOLD orders have not had stock deducted, so deduction here is safe.
  IF NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id AND status IN ('PENDING', 'HOLD')
  ) THEN
    RAISE EXCEPTION 'Order % must be PENDING or HOLD to approve (current status is not eligible)', p_order_id;
  END IF;

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

  UPDATE public.orders
    SET status = p_status, updated_at = NOW()
    WHERE id = p_order_id;
END;
$$;
