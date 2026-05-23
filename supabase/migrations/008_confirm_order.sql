-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 008: confirm_order()
-- Atomically deducts stock for all items and sets status=CONFIRMED
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.confirm_order(p_order_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_item RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = p_order_id AND status = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'Order % must be in PENDING status to confirm', p_order_id;
  END IF;

  FOR v_item IN
    SELECT seed_id, quantity, unit
    FROM   public.order_items
    WHERE  order_id = p_order_id
  LOOP
    PERFORM public.deduct_seed_stock(v_item.seed_id, v_item.quantity, v_item.unit);
  END LOOP;

  UPDATE public.orders
  SET    status = 'CONFIRMED', updated_at = NOW()
  WHERE  id = p_order_id;
END;
$$;
