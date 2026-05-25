-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 013: Stock Movements Ledger
-- Run in: Supabase SQL editor (Project → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- Step 1: Table — stock_movements
-- Append-only ledger. Balance is a window-function at read time.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.stock_movements (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  seed_id          UUID        NOT NULL REFERENCES public.seed_products(id) ON DELETE CASCADE,
  batch_number     TEXT        NOT NULL,
  movement_type    TEXT        NOT NULL CHECK (movement_type IN (
                                 'ADD', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DISPATCH'
                               )),
  quantity_packets INTEGER     NOT NULL CHECK (quantity_packets > 0),
  quantity_bags    INTEGER     NOT NULL DEFAULT 0,
  quantity_pkt_rem INTEGER     NOT NULL DEFAULT 0,
  movement_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  movement_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_id         UUID        REFERENCES public.orders(id)   ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sm_seed_batch  ON public.stock_movements (seed_id, batch_number, movement_date ASC, created_at ASC);
CREATE INDEX idx_sm_order       ON public.stock_movements (order_id);
CREATE INDEX idx_sm_movement_by ON public.stock_movements (movement_by);

-- ──────────────────────────────────────────────────────────────
-- View: stock_movements_with_balance
-- Computes running balance per seed+batch via window function.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.stock_movements_with_balance AS
SELECT
  sm.*,
  SUM(
    CASE WHEN sm.movement_type IN ('ADD', 'ADJUSTMENT_IN')
         THEN  sm.quantity_packets
         ELSE -sm.quantity_packets
    END
  ) OVER (
    PARTITION BY sm.seed_id, sm.batch_number
    ORDER BY sm.movement_date ASC, sm.created_at ASC, sm.id ASC
  ) AS running_balance_packets
FROM public.stock_movements sm;

-- ──────────────────────────────────────────────────────────────
-- Step 2: RLS on stock_movements (append-only — no UPDATE/DELETE policy)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sm_select_admin" ON public.stock_movements
  FOR SELECT USING (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY "sm_insert_admin" ON public.stock_movements
  FOR INSERT WITH CHECK (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- No UPDATE or DELETE policy: corrections are new rows, not edits.

-- ──────────────────────────────────────────────────────────────
-- Step 3: Add notes + movement_date columns to seed_stock
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.seed_stock
  ADD COLUMN IF NOT EXISTS notes         TEXT;

ALTER TABLE public.seed_stock
  ADD COLUMN IF NOT EXISTS movement_date DATE DEFAULT CURRENT_DATE;

-- ──────────────────────────────────────────────────────────────
-- Step 4: Trigger — log manual stock changes as ADD / ADJUSTMENT_*
-- Fires after INSERT or UPDATE on seed_stock.
-- Suppressed when called from inside deduct_seed_stock (Step 5).
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_stock_manual_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_ppb     INTEGER;
  v_new_pkt INTEGER;
  v_old_pkt INTEGER;
  v_delta   INTEGER;
  v_type    TEXT;
  v_abs     INTEGER;
BEGIN
  -- Skip if called from inside deduct_seed_stock
  IF current_setting('app.in_deduction', true) = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT packets_per_bag INTO v_ppb
  FROM public.seed_products WHERE id = NEW.seed_id;

  v_new_pkt := NEW.bag_stock  * v_ppb + NEW.packet_stock;
  v_old_pkt := COALESCE(OLD.bag_stock, 0) * v_ppb + COALESCE(OLD.packet_stock, 0);
  v_delta   := v_new_pkt - v_old_pkt;

  IF TG_OP = 'INSERT' THEN
    v_type := 'ADD';
    v_abs  := v_new_pkt;
  ELSIF v_delta > 0 THEN
    v_type := 'ADJUSTMENT_IN';
    v_abs  := v_delta;
  ELSIF v_delta < 0 THEN
    v_type := 'ADJUSTMENT_OUT';
    v_abs  := ABS(v_delta);
  ELSE
    RETURN NEW; -- no change, nothing to log
  END IF;

  IF v_abs = 0 THEN RETURN NEW; END IF;

  INSERT INTO public.stock_movements (
    seed_id, batch_number, movement_type,
    quantity_packets, quantity_bags, quantity_pkt_rem,
    movement_date, movement_by, notes
  ) VALUES (
    NEW.seed_id, NEW.batch_number, v_type,
    v_abs,
    FLOOR(v_abs::NUMERIC / v_ppb),
    v_abs % v_ppb,
    COALESCE(NEW.movement_date, CURRENT_DATE),
    NEW.last_updated_by,
    NEW.notes
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_stock_log_manual_change
  AFTER INSERT OR UPDATE ON public.seed_stock
  FOR EACH ROW EXECUTE FUNCTION public.log_stock_manual_change();

-- ──────────────────────────────────────────────────────────────
-- Step 5: Replace deduct_seed_stock — adds DISPATCH logging + session flag
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deduct_seed_stock(
  p_seed_id      UUID,
  p_quantity     INTEGER,
  p_unit         TEXT,
  p_order_id     UUID  DEFAULT NULL,
  p_performed_by UUID  DEFAULT NULL,
  p_approved_by  UUID  DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_ppb        INTEGER;
  v_to_deduct  INTEGER;
  v_remaining  INTEGER;
  v_new_total  INTEGER;
  v_deducted   INTEGER;
  r            RECORD;
BEGIN
  PERFORM set_config('app.in_deduction', 'true', true);

  SELECT packets_per_bag INTO v_ppb
  FROM public.seed_products WHERE id = p_seed_id;

  IF v_ppb IS NULL THEN
    RAISE EXCEPTION 'Seed product % not found', p_seed_id;
  END IF;

  v_to_deduct := CASE
    WHEN p_unit IN ('Bag', 'Box') THEN p_quantity * v_ppb
    ELSE p_quantity
  END;

  v_remaining := v_to_deduct;

  FOR r IN
    SELECT id, batch_number,
           bag_stock * v_ppb + packet_stock AS total_packets
    FROM   public.seed_stock
    WHERE  seed_id = p_seed_id
      AND  (bag_stock > 0 OR packet_stock > 0)
    ORDER  BY created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    IF r.total_packets <= v_remaining THEN
      v_deducted  := r.total_packets;
      v_remaining := v_remaining - r.total_packets;
      UPDATE public.seed_stock
        SET bag_stock = 0, packet_stock = 0, updated_at = NOW()
        WHERE id = r.id;
    ELSE
      v_deducted  := v_remaining;
      v_new_total := r.total_packets - v_remaining;
      v_remaining := 0;
      UPDATE public.seed_stock
        SET bag_stock    = FLOOR(v_new_total::NUMERIC / v_ppb),
            packet_stock = v_new_total % v_ppb,
            updated_at   = NOW()
        WHERE id = r.id;
    END IF;

    INSERT INTO public.stock_movements (
      seed_id, batch_number, movement_type,
      quantity_packets, quantity_bags, quantity_pkt_rem,
      movement_date, movement_by, approved_by, order_id
    ) VALUES (
      p_seed_id, r.batch_number, 'DISPATCH',
      v_deducted,
      FLOOR(v_deducted::NUMERIC / v_ppb),
      v_deducted % v_ppb,
      CURRENT_DATE,
      p_performed_by,
      p_approved_by,
      p_order_id
    );
  END LOOP;

  PERFORM set_config('app.in_deduction', 'false', true);

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Insufficient stock: still need % packets for product %',
      v_remaining, p_seed_id;
  END IF;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- Step 6: Replace approve_order — passes staff_id + auth.uid() to deduct_seed_stock
-- ──────────────────────────────────────────────────────────────
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

  IF NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = p_order_id AND status = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'Order % must be PENDING to approve', p_order_id;
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

-- ──────────────────────────────────────────────────────────────
-- Step 7: Reconciliation check function
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_batch_reconciliation(
  p_seed_id      UUID,
  p_batch_number TEXT
)
RETURNS TABLE (
  ledger_packets INTEGER,
  actual_packets INTEGER,
  is_reconciled  BOOLEAN,
  discrepancy    INTEGER
) LANGUAGE sql AS $$
  WITH ledger AS (
    SELECT COALESCE(SUM(
      CASE WHEN movement_type IN ('ADD', 'ADJUSTMENT_IN')
           THEN  quantity_packets
           ELSE -quantity_packets
      END
    ), 0) AS total
    FROM public.stock_movements
    WHERE seed_id = p_seed_id AND batch_number = p_batch_number
  ),
  actual AS (
    SELECT COALESCE(
      ss.bag_stock * sp.packets_per_bag + ss.packet_stock, 0
    ) AS total
    FROM public.seed_stock ss
    JOIN public.seed_products sp ON sp.id = ss.seed_id
    WHERE ss.seed_id = p_seed_id AND ss.batch_number = p_batch_number
  )
  SELECT
    ledger.total::INTEGER,
    actual.total::INTEGER,
    (ledger.total = actual.total),
    (actual.total - ledger.total)::INTEGER
  FROM ledger, actual;
$$;

-- ──────────────────────────────────────────────────────────────
-- Step 8: Historical backfill
-- One synthetic ADD row per existing non-zero seed_stock batch.
-- ──────────────────────────────────────────────────────────────

-- Suppress the manual-change trigger so we don't double-log
SELECT set_config('app.in_deduction', 'true', true);

INSERT INTO public.stock_movements (
  seed_id, batch_number, movement_type,
  quantity_packets, quantity_bags, quantity_pkt_rem,
  movement_date, movement_by, notes, created_at
)
SELECT
  ss.seed_id,
  ss.batch_number,
  'ADD',
  (ss.bag_stock * sp.packets_per_bag + ss.packet_stock),
  ss.bag_stock,
  ss.packet_stock,
  ss.created_at::DATE,
  ss.last_updated_by,
  'Migrated — pre-ledger balance (estimated)',
  ss.created_at
FROM public.seed_stock ss
JOIN public.seed_products sp ON sp.id = ss.seed_id
WHERE ss.bag_stock > 0 OR ss.packet_stock > 0;

SELECT set_config('app.in_deduction', 'false', true);
