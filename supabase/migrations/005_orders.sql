-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 005: Orders + Order Items
-- Run in: Supabase SQL editor (Project → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- Table: orders
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.orders (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number     TEXT        NOT NULL UNIQUE,
  dealer_id        UUID        NOT NULL REFERENCES public.dealers(id)  ON DELETE RESTRICT,
  staff_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- Logistics
  center           TEXT,
  transport_name   TEXT,
  delivery_center  TEXT,
  delivery_date    DATE,

  -- Status
  status           TEXT        NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('DRAFT','PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED')),
  payment_status   TEXT        NOT NULL DEFAULT 'UNPAID'
                     CHECK (payment_status IN ('UNPAID','PARTIAL','PAID')),
  payment_method   TEXT        CHECK (payment_method IN ('CASH','CHEQUE','BANK_TRANSFER','UPI')),

  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_orders_dealer_id ON public.orders(dealer_id);
CREATE INDEX idx_orders_staff_id  ON public.orders(staff_id);
CREATE INDEX idx_orders_status    ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

-- ──────────────────────────────────────────────────────────────
-- Table: order_items
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.order_items (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id   UUID        NOT NULL REFERENCES public.orders(id)       ON DELETE CASCADE,
  seed_id    UUID        NOT NULL REFERENCES public.seed_products(id) ON DELETE RESTRICT,
  unit       TEXT        NOT NULL DEFAULT 'Bag'
               CHECK (unit IN ('Bag','Packet','Box')),
  quantity   INTEGER     NOT NULL CHECK (quantity > 0),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER order_items_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_seed_id  ON public.order_items(seed_id);

-- ──────────────────────────────────────────────────────────────
-- RLS: orders
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Admins/Super Admins see all orders
CREATE POLICY "orders_select_admin" ON public.orders
  FOR SELECT USING (get_my_role() IN ('SUPER_ADMIN','ADMIN'));

-- Staff see only their own orders
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING (staff_id = auth.uid());

-- Staff can create orders
CREATE POLICY "orders_insert_staff" ON public.orders
  FOR INSERT WITH CHECK (staff_id = auth.uid() AND get_my_role() IN ('STAFF','ADMIN','SUPER_ADMIN'));

-- Admins can update any order; staff can only update their own
CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE USING (get_my_role() IN ('SUPER_ADMIN','ADMIN'));

CREATE POLICY "orders_update_own" ON public.orders
  FOR UPDATE USING (staff_id = auth.uid() AND status IN ('DRAFT','PENDING'));

-- ──────────────────────────────────────────────────────────────
-- RLS: order_items
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select_admin" ON public.order_items
  FOR SELECT USING (get_my_role() IN ('SUPER_ADMIN','ADMIN'));

CREATE POLICY "order_items_select_own" ON public.order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE staff_id = auth.uid())
  );

CREATE POLICY "order_items_insert" ON public.order_items
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM public.orders WHERE staff_id = auth.uid())
    OR get_my_role() IN ('SUPER_ADMIN','ADMIN')
  );

CREATE POLICY "order_items_update_admin" ON public.order_items
  FOR UPDATE USING (get_my_role() IN ('SUPER_ADMIN','ADMIN'));
