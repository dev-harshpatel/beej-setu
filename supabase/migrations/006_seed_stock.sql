-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 006: Seed Stock
-- Run in: Supabase SQL editor (Project → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- Table: seed_stock
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.seed_stock (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  seed_id          UUID        NOT NULL REFERENCES public.seed_products(id) ON DELETE CASCADE,
  batch_number     TEXT        NOT NULL,
  bag_stock        INTEGER     NOT NULL DEFAULT 0 CHECK (bag_stock    >= 0),
  packet_stock     INTEGER     NOT NULL DEFAULT 0 CHECK (packet_stock >= 0),
  last_updated_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (seed_id, batch_number)
);

CREATE TRIGGER seed_stock_updated_at
  BEFORE UPDATE ON public.seed_stock
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_seed_stock_seed_id ON public.seed_stock(seed_id);

-- ──────────────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.seed_stock ENABLE ROW LEVEL SECURITY;

-- Only admins and super admins can view stock
CREATE POLICY "stock_select_admin" ON public.seed_stock
  FOR SELECT USING (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- Only admins can insert / update / delete
CREATE POLICY "stock_insert_admin" ON public.seed_stock
  FOR INSERT WITH CHECK (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY "stock_update_admin" ON public.seed_stock
  FOR UPDATE USING (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY "stock_delete_admin" ON public.seed_stock
  FOR DELETE USING (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- ──────────────────────────────────────────────────────────────
-- Function: deduct_seed_stock
-- Deducts from batches FIFO, auto-recalculates bag/packet split.
--   p_unit: 'Bag' | 'Box' → deduct quantity × packets_per_bag
--           'Packet'       → deduct quantity packets
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deduct_seed_stock(
  p_seed_id UUID,
  p_quantity INTEGER,
  p_unit     TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_packets_per_bag  INTEGER;
  v_to_deduct        INTEGER;
  v_remaining        INTEGER;
  v_new_total        INTEGER;
  r                  RECORD;
BEGIN
  SELECT packets_per_bag INTO v_packets_per_bag
  FROM public.seed_products WHERE id = p_seed_id;

  IF v_packets_per_bag IS NULL THEN
    RAISE EXCEPTION 'Seed product % not found', p_seed_id;
  END IF;

  v_to_deduct := CASE
    WHEN p_unit IN ('Bag', 'Box') THEN p_quantity * v_packets_per_bag
    ELSE p_quantity
  END;

  v_remaining := v_to_deduct;

  -- FIFO across batches (oldest first)
  FOR r IN
    SELECT id,
           bag_stock * v_packets_per_bag + packet_stock AS total_packets
    FROM   public.seed_stock
    WHERE  seed_id = p_seed_id
      AND  (bag_stock > 0 OR packet_stock > 0)
    ORDER  BY created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    IF r.total_packets <= v_remaining THEN
      UPDATE public.seed_stock
      SET    bag_stock = 0, packet_stock = 0, updated_at = NOW()
      WHERE  id = r.id;
      v_remaining := v_remaining - r.total_packets;
    ELSE
      v_new_total := r.total_packets - v_remaining;
      UPDATE public.seed_stock
      SET    bag_stock    = FLOOR(v_new_total::NUMERIC / v_packets_per_bag),
             packet_stock = v_new_total % v_packets_per_bag,
             updated_at   = NOW()
      WHERE  id = r.id;
      v_remaining := 0;
    END IF;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Insufficient stock: still need % packets for product %',
      v_remaining, p_seed_id;
  END IF;
END;
$$;
