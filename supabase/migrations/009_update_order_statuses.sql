-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 009: New order status model
--
-- Old statuses: DRAFT | PENDING | CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED
-- New statuses: PENDING | APPROVED | PARTIALLY_APPROVED | HOLD | CANCELLED | SHIPPED
--
-- Changes:
--   1. Migrate existing rows to new status values
--   2. Drop old CHECK constraint, add new one
--   3. Replace confirm_order() RPC with approve_order(id, status)
-- ═══════════════════════════════════════════════════════════════

-- ── Step 1: Migrate existing data ────────────────────────────────
-- CONFIRMED / PROCESSING  → APPROVED
-- DELIVERED               → SHIPPED  (already dispatched, closest equivalent)
-- DRAFT                   → PENDING  (not yet submitted = pending review)
-- CANCELLED               → CANCELLED (no change)
-- PENDING                 → PENDING  (no change)
-- SHIPPED                 → SHIPPED  (no change)

UPDATE public.orders
SET status = 'APPROVED'
WHERE status IN ('CONFIRMED', 'PROCESSING');

UPDATE public.orders
SET status = 'SHIPPED'
WHERE status = 'DELIVERED';

UPDATE public.orders
SET status = 'PENDING'
WHERE status = 'DRAFT';

-- ── Step 2: Swap the CHECK constraint ────────────────────────────
-- Drop the old constraint by name (Postgres auto-names it orders_status_check).
-- Use a DO block to handle cases where the name differs.
DO $$
BEGIN
  ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS orders_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END;
$$;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'PENDING',
    'APPROVED',
    'PARTIALLY_APPROVED',
    'HOLD',
    'CANCELLED',
    'GODOWN_DISPATCHED',
    'TRANSPORT_DISPATCHED',
    'SHIPPED'
  ));

-- ── Step 3: Replace confirm_order() with approve_order() ─────────
-- approve_order accepts the target approval status so it works for
-- both APPROVED (full quantities) and PARTIALLY_APPROVED (reduced quantities).
-- The old confirm_order() function is dropped after creating the replacement
-- so existing DB connections don't silently call the stale version.

CREATE OR REPLACE FUNCTION public.approve_order(
  p_order_id UUID,
  p_status   TEXT DEFAULT 'APPROVED'
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Validate the target status is an approval status
  IF p_status NOT IN ('APPROVED', 'PARTIALLY_APPROVED') THEN
    RAISE EXCEPTION 'approve_order() only accepts APPROVED or PARTIALLY_APPROVED, got: %', p_status;
  END IF;

  -- Order must be PENDING to be approved
  IF NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id AND status = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'Order % must be in PENDING status to approve', p_order_id;
  END IF;

  -- Atomically deduct stock for all items
  FOR v_item IN
    SELECT seed_id, quantity, unit
    FROM   public.order_items
    WHERE  order_id = p_order_id
  LOOP
    PERFORM public.deduct_seed_stock(v_item.seed_id, v_item.quantity, v_item.unit);
  END LOOP;

  -- Set the approval status
  UPDATE public.orders
  SET    status     = p_status,
         updated_at = NOW()
  WHERE  id = p_order_id;
END;
$$;

-- Keep confirm_order() as a shim so any direct DB callers don't break immediately.
-- It delegates to approve_order() with the APPROVED status.
CREATE OR REPLACE FUNCTION public.confirm_order(p_order_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.approve_order(p_order_id, 'APPROVED');
END;
$$;
