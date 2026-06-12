-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 025: Multi-Tenancy
-- Run in: Supabase SQL editor (Project → SQL Editor → New query)
--
-- Converts the schema to multi-tenant (docs/MULTI_TENANCY_PLAN.md):
--   1.  organizations table + default org seeded
--   2.  organization_id on every tenant table, backfilled, NOT NULL
--   3.  Unique constraints rescoped per-org (order_number, crops.name)
--   4.  get_my_org_id() helper
--   5.  Every RLS policy rewritten with an org check
--       (collections gets its first policies — it had NONE)
--   6.  Org guards inside SECURITY-sensitive functions + trigger
--   7.  stock_movements_with_balance recreated with security_invoker
--   8.  Dead functions dropped (confirm_order, old deduct overload)
--   9.  Per-org indexes
--
-- Safe on existing production data: all current rows are assigned
-- to the default organization. No re-login required (org is resolved
-- from profiles, not the JWT).
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- Step 1: organizations table
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL UNIQUE,
  logo_url   TEXT,
  status     TEXT        NOT NULL DEFAULT 'ACTIVE'
               CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CANCELLED')),
  settings   JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS organizations_updated_at ON public.organizations;
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ──────────────────────────────────────────────────────────────
-- Step 2: Seed the default organization (the current company).
-- Fixed UUID so the backfill below is deterministic and re-runnable.
-- ──────────────────────────────────────────────────────────────
INSERT INTO public.organizations (id, name, slug, status)
VALUES ('00000000-0000-4000-a000-000000000001', 'Beej Setu', 'beej-setu', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- Step 3: Add organization_id to every tenant table (nullable first)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.profiles         ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.dealers          ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.crops            ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.seed_products    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.seed_stock       ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.stock_movements  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.orders           ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.order_items      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.challans         ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.collections      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.bulk_upload_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;

-- ──────────────────────────────────────────────────────────────
-- Step 4: Backfill all existing rows into the default org.
-- (The seed_stock UPDATE fires log_stock_manual_change, but the
--  packet delta is zero so the trigger logs nothing.)
-- ──────────────────────────────────────────────────────────────
UPDATE public.profiles         SET organization_id = '00000000-0000-4000-a000-000000000001' WHERE organization_id IS NULL;
UPDATE public.dealers          SET organization_id = '00000000-0000-4000-a000-000000000001' WHERE organization_id IS NULL;
UPDATE public.crops            SET organization_id = '00000000-0000-4000-a000-000000000001' WHERE organization_id IS NULL;
UPDATE public.seed_products    SET organization_id = '00000000-0000-4000-a000-000000000001' WHERE organization_id IS NULL;
UPDATE public.seed_stock       SET organization_id = '00000000-0000-4000-a000-000000000001' WHERE organization_id IS NULL;
UPDATE public.stock_movements  SET organization_id = '00000000-0000-4000-a000-000000000001' WHERE organization_id IS NULL;
UPDATE public.orders           SET organization_id = '00000000-0000-4000-a000-000000000001' WHERE organization_id IS NULL;
UPDATE public.order_items      SET organization_id = '00000000-0000-4000-a000-000000000001' WHERE organization_id IS NULL;
UPDATE public.challans         SET organization_id = '00000000-0000-4000-a000-000000000001' WHERE organization_id IS NULL;
UPDATE public.collections      SET organization_id = '00000000-0000-4000-a000-000000000001' WHERE organization_id IS NULL;
UPDATE public.bulk_upload_logs SET organization_id = '00000000-0000-4000-a000-000000000001' WHERE organization_id IS NULL;

-- ──────────────────────────────────────────────────────────────
-- Step 5: Enforce NOT NULL
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.profiles         ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.dealers          ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.crops            ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.seed_products    ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.seed_stock       ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.stock_movements  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.orders           ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.order_items      ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.challans         ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.collections      ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.bulk_upload_logs ALTER COLUMN organization_id SET NOT NULL;

-- ──────────────────────────────────────────────────────────────
-- Step 6: Rescope unique constraints from global to per-org.
-- username stays globally unique (v1 decision — username login).
-- seed_products / seed_stock uniques are already org-scoped via FKs.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_number_key;
ALTER TABLE public.orders ADD CONSTRAINT orders_org_order_number_key
  UNIQUE (organization_id, order_number);

ALTER TABLE public.crops DROP CONSTRAINT IF EXISTS crops_name_key;
ALTER TABLE public.crops ADD CONSTRAINT crops_org_name_key
  UNIQUE (organization_id, name);

-- ──────────────────────────────────────────────────────────────
-- Step 7: Helper — current user's org.
-- Same pattern as get_my_role(): SECURITY DEFINER lookup on profiles.
-- (Chosen over a JWT app_metadata claim: takes effect immediately,
--  no re-login after this migration, no staleness on org/role change.)
-- Returns NULL for anon AND for the service-role context — callers
-- below treat NULL as "trusted server code, skip the org guard",
-- which is safe because service role bypasses RLS anyway.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ──────────────────────────────────────────────────────────────
-- Step 8: RLS — drop every existing policy, recreate with org checks
-- ──────────────────────────────────────────────────────────────

-- ── organizations ─────────────────────────────────────────────
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_select_member" ON public.organizations;
CREATE POLICY "organizations_select_member" ON public.organizations
  FOR SELECT USING (id = get_my_org_id());

DROP POLICY IF EXISTS "organizations_update_super_admin" ON public.organizations;
CREATE POLICY "organizations_update_super_admin" ON public.organizations
  FOR UPDATE USING (id = get_my_org_id() AND get_my_role() = 'SUPER_ADMIN');
-- No INSERT/DELETE policies: org creation happens via service role only.

-- ── profiles ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());

-- ── dealers (hard-delete model since migration 023) ───────────
DROP POLICY IF EXISTS "dealers_select"       ON public.dealers;
DROP POLICY IF EXISTS "dealers_insert_admin" ON public.dealers;
DROP POLICY IF EXISTS "dealers_update_admin" ON public.dealers;
DROP POLICY IF EXISTS "dealers_delete_admin" ON public.dealers;

CREATE POLICY "dealers_select" ON public.dealers
  FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "dealers_insert_admin" ON public.dealers
  FOR INSERT WITH CHECK (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());
CREATE POLICY "dealers_update_admin" ON public.dealers
  FOR UPDATE USING (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());
CREATE POLICY "dealers_delete_admin" ON public.dealers
  FOR DELETE USING (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());

-- ── crops ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "crops_select"      ON public.crops;
DROP POLICY IF EXISTS "crops_write_admin" ON public.crops;

CREATE POLICY "crops_select" ON public.crops
  FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "crops_write_admin" ON public.crops
  FOR ALL
  USING (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id())
  WITH CHECK (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());

-- ── seed_products ─────────────────────────────────────────────
DROP POLICY IF EXISTS "seed_products_select"      ON public.seed_products;
DROP POLICY IF EXISTS "seed_products_write_admin" ON public.seed_products;

CREATE POLICY "seed_products_select" ON public.seed_products
  FOR SELECT USING (deleted_at IS NULL AND organization_id = get_my_org_id());
CREATE POLICY "seed_products_write_admin" ON public.seed_products
  FOR ALL
  USING (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id())
  WITH CHECK (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());

-- ── orders ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "orders_select_admin"          ON public.orders;
DROP POLICY IF EXISTS "orders_select_own"            ON public.orders;
DROP POLICY IF EXISTS "orders_select_dispatch_staff" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_staff"          ON public.orders;
DROP POLICY IF EXISTS "orders_update_admin"          ON public.orders;
DROP POLICY IF EXISTS "orders_update_own"            ON public.orders;

CREATE POLICY "orders_select_admin" ON public.orders
  FOR SELECT USING (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING (staff_id = auth.uid() AND organization_id = get_my_org_id());
CREATE POLICY "orders_select_dispatch_staff" ON public.orders
  FOR SELECT USING (get_my_role() = 'DISPATCH_STAFF' AND organization_id = get_my_org_id());
CREATE POLICY "orders_insert_staff" ON public.orders
  FOR INSERT WITH CHECK (
    staff_id = auth.uid()
    AND get_my_role() IN ('STAFF','ADMIN','SUPER_ADMIN')
    AND organization_id = get_my_org_id()
  );
CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE USING (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());
CREATE POLICY "orders_update_own" ON public.orders
  FOR UPDATE USING (
    staff_id = auth.uid()
    AND status IN ('DRAFT','PENDING')
    AND organization_id = get_my_org_id()
  );

-- ── order_items ───────────────────────────────────────────────
DROP POLICY IF EXISTS "order_items_select_admin"          ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_own"            ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_dispatch_staff" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert"                ON public.order_items;
DROP POLICY IF EXISTS "order_items_update_admin"          ON public.order_items;

CREATE POLICY "order_items_select_admin" ON public.order_items
  FOR SELECT USING (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());
CREATE POLICY "order_items_select_own" ON public.order_items
  FOR SELECT USING (
    organization_id = get_my_org_id()
    AND order_id IN (SELECT id FROM public.orders WHERE staff_id = auth.uid())
  );
CREATE POLICY "order_items_select_dispatch_staff" ON public.order_items
  FOR SELECT USING (get_my_role() = 'DISPATCH_STAFF' AND organization_id = get_my_org_id());
CREATE POLICY "order_items_insert" ON public.order_items
  FOR INSERT WITH CHECK (
    organization_id = get_my_org_id()
    AND (
      order_id IN (SELECT id FROM public.orders WHERE staff_id = auth.uid())
      OR get_my_role() IN ('SUPER_ADMIN','ADMIN')
    )
  );
CREATE POLICY "order_items_update_admin" ON public.order_items
  FOR UPDATE USING (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());

-- ── seed_stock ────────────────────────────────────────────────
DROP POLICY IF EXISTS "stock_select_admin" ON public.seed_stock;
DROP POLICY IF EXISTS "stock_insert_admin" ON public.seed_stock;
DROP POLICY IF EXISTS "stock_update_admin" ON public.seed_stock;
DROP POLICY IF EXISTS "stock_delete_admin" ON public.seed_stock;

CREATE POLICY "stock_select_admin" ON public.seed_stock
  FOR SELECT USING (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());
CREATE POLICY "stock_insert_admin" ON public.seed_stock
  FOR INSERT WITH CHECK (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());
CREATE POLICY "stock_update_admin" ON public.seed_stock
  FOR UPDATE USING (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());
CREATE POLICY "stock_delete_admin" ON public.seed_stock
  FOR DELETE USING (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());

-- ── stock_movements (append-only: still no UPDATE/DELETE) ─────
DROP POLICY IF EXISTS "sm_select_admin" ON public.stock_movements;
DROP POLICY IF EXISTS "sm_insert_admin" ON public.stock_movements;

CREATE POLICY "sm_select_admin" ON public.stock_movements
  FOR SELECT USING (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());
CREATE POLICY "sm_insert_admin" ON public.stock_movements
  FOR INSERT WITH CHECK (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());

-- ── challans ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "challans_select" ON public.challans;
DROP POLICY IF EXISTS "challans_insert" ON public.challans;
DROP POLICY IF EXISTS "challans_update" ON public.challans;
DROP POLICY IF EXISTS "challans_delete" ON public.challans;

CREATE POLICY "challans_select" ON public.challans
  FOR SELECT USING (get_my_role() IN ('SUPER_ADMIN','ADMIN','DISPATCH_STAFF') AND organization_id = get_my_org_id());
CREATE POLICY "challans_insert" ON public.challans
  FOR INSERT WITH CHECK (get_my_role() IN ('SUPER_ADMIN','ADMIN','DISPATCH_STAFF') AND organization_id = get_my_org_id());
CREATE POLICY "challans_update" ON public.challans
  FOR UPDATE USING (get_my_role() IN ('SUPER_ADMIN','ADMIN','DISPATCH_STAFF') AND organization_id = get_my_org_id());
CREATE POLICY "challans_delete" ON public.challans
  FOR DELETE USING (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());

-- ── collections — FIRST policies ever (migration 018 enabled RLS
--    but defined none; only service-role access worked) ─────────
DROP POLICY IF EXISTS "collections_select_admin" ON public.collections;
DROP POLICY IF EXISTS "collections_select_own"   ON public.collections;
DROP POLICY IF EXISTS "collections_insert"       ON public.collections;
DROP POLICY IF EXISTS "collections_update"       ON public.collections;
DROP POLICY IF EXISTS "collections_delete"       ON public.collections;

CREATE POLICY "collections_select_admin" ON public.collections
  FOR SELECT USING (get_my_role() IN ('SUPER_ADMIN','ADMIN') AND organization_id = get_my_org_id());
CREATE POLICY "collections_select_own" ON public.collections
  FOR SELECT USING (staff_id = auth.uid() AND organization_id = get_my_org_id());
CREATE POLICY "collections_insert" ON public.collections
  FOR INSERT WITH CHECK (
    organization_id = get_my_org_id()
    AND (
      (staff_id = auth.uid() AND get_my_role() IN ('STAFF','ADMIN','SUPER_ADMIN'))
      OR get_my_role() IN ('SUPER_ADMIN','ADMIN')
    )
  );
CREATE POLICY "collections_update" ON public.collections
  FOR UPDATE USING (
    organization_id = get_my_org_id()
    AND (staff_id = auth.uid() OR get_my_role() IN ('SUPER_ADMIN','ADMIN'))
  );
CREATE POLICY "collections_delete" ON public.collections
  FOR DELETE USING (
    organization_id = get_my_org_id()
    AND (staff_id = auth.uid() OR get_my_role() IN ('SUPER_ADMIN','ADMIN'))
  );

-- ── bulk_upload_logs ──────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can read bulk_upload_logs" ON public.bulk_upload_logs;

CREATE POLICY "Admins can read bulk_upload_logs" ON public.bulk_upload_logs
  FOR SELECT USING (
    get_my_role() IN ('SUPER_ADMIN','ADMIN')
    AND organization_id = get_my_org_id()
  );
-- Writes stay service-role only (bypass RLS); no INSERT policy.

-- ──────────────────────────────────────────────────────────────
-- Step 9: Functions, trigger, view
-- ──────────────────────────────────────────────────────────────

-- 9a: Drop dead functions.
--   confirm_order sets status='CONFIRMED', which migration 010's check
--   constraint no longer allows — it can only fail. The old 3-param
--   deduct_seed_stock overload (from 006) was superseded by the 6-param
--   version in 014 and makes 3-arg calls ambiguous.
DROP FUNCTION IF EXISTS public.confirm_order(UUID);
DROP FUNCTION IF EXISTS public.deduct_seed_stock(UUID, INTEGER, TEXT);

-- 9b: deduct_seed_stock — org guard + stamp organization_id on ledger rows.
-- Guard semantics: get_my_org_id() IS NULL means service-role/trusted
-- server context → skip guard (RLS is bypassed there anyway).
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
  v_org        UUID;
  v_to_deduct  INTEGER;
  v_remaining  INTEGER;
  v_new_total  INTEGER;
  v_deducted   INTEGER;
  r            RECORD;
BEGIN
  PERFORM set_config('app.in_deduction', 'true', true);

  SELECT packets_per_bag, organization_id INTO v_ppb, v_org
  FROM public.seed_products WHERE id = p_seed_id;

  IF v_ppb IS NULL THEN
    RAISE EXCEPTION 'Seed product % not found', p_seed_id;
  END IF;

  IF public.get_my_org_id() IS NOT NULL AND v_org <> public.get_my_org_id() THEN
    RAISE EXCEPTION 'Forbidden: seed product % belongs to another organization', p_seed_id;
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
      organization_id, seed_id, batch_number, movement_type,
      quantity_packets, quantity_bags, quantity_pkt_rem,
      movement_date, movement_by, approved_by, order_id
    ) VALUES (
      v_org, p_seed_id, r.batch_number, 'DISPATCH',
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

-- 9c: approve_order — org guard first, then the migration-017 logic
-- (idempotent deduction) unchanged.
CREATE OR REPLACE FUNCTION public.approve_order(
  p_order_id UUID,
  p_status   TEXT DEFAULT 'APPROVED'
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_item             RECORD;
  v_staff_id         UUID;
  v_org              UUID;
  v_already_deducted BOOLEAN;
BEGIN
  IF p_status NOT IN ('APPROVED', 'PARTIALLY_APPROVED') THEN
    RAISE EXCEPTION 'approve_order() only accepts APPROVED or PARTIALLY_APPROVED, got: %', p_status;
  END IF;

  SELECT staff_id, organization_id INTO v_staff_id, v_org
  FROM public.orders
  WHERE id = p_order_id AND status IN ('PENDING', 'HOLD');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % must be PENDING or HOLD to approve (current status is not eligible)', p_order_id;
  END IF;

  IF public.get_my_org_id() IS NOT NULL AND v_org <> public.get_my_org_id() THEN
    RAISE EXCEPTION 'Forbidden: order % belongs to another organization', p_order_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.stock_movements
    WHERE order_id = p_order_id AND movement_type = 'DISPATCH'
  ) INTO v_already_deducted;

  IF NOT v_already_deducted THEN
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

-- 9d: log_stock_manual_change — stamp organization_id on ledger rows.
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
    RETURN NEW;
  END IF;

  IF v_abs = 0 THEN RETURN NEW; END IF;

  INSERT INTO public.stock_movements (
    organization_id, seed_id, batch_number, movement_type,
    quantity_packets, quantity_bags, quantity_pkt_rem,
    movement_date, movement_by, notes
  ) VALUES (
    NEW.organization_id, NEW.seed_id, NEW.batch_number, v_type,
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

-- 9e: check_batch_reconciliation — org guard (sql → plpgsql for the guard).
CREATE OR REPLACE FUNCTION public.check_batch_reconciliation(
  p_seed_id      UUID,
  p_batch_number TEXT
)
RETURNS TABLE (
  ledger_packets INTEGER,
  actual_packets INTEGER,
  is_reconciled  BOOLEAN,
  discrepancy    INTEGER
) LANGUAGE plpgsql AS $$
DECLARE
  v_org UUID;
BEGIN
  SELECT organization_id INTO v_org
  FROM public.seed_products WHERE id = p_seed_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Seed product % not found', p_seed_id;
  END IF;

  IF public.get_my_org_id() IS NOT NULL AND v_org <> public.get_my_org_id() THEN
    RAISE EXCEPTION 'Forbidden: seed product % belongs to another organization', p_seed_id;
  END IF;

  RETURN QUERY
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
END;
$$;

-- 9f: Recreate the balance view.
-- DROP + CREATE (not OR REPLACE) because organization_id changes the
-- column order of sm.*. security_invoker makes the view respect the
-- querying user's RLS — without it, postgres-owned views bypass RLS
-- entirely (pre-existing leak: the old view exposed all movements to
-- any authenticated user).
DROP VIEW IF EXISTS public.stock_movements_with_balance;
CREATE VIEW public.stock_movements_with_balance
WITH (security_invoker = true) AS
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
-- Step 10: Indexes
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_org         ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_dealers_org          ON public.dealers(organization_id);
CREATE INDEX IF NOT EXISTS idx_crops_org            ON public.crops(organization_id);
CREATE INDEX IF NOT EXISTS idx_seed_products_org    ON public.seed_products(organization_id);
CREATE INDEX IF NOT EXISTS idx_seed_stock_org       ON public.seed_stock(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org  ON public.stock_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_org           ON public.orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_items_org      ON public.order_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_challans_org         ON public.challans(organization_id);
CREATE INDEX IF NOT EXISTS idx_collections_org      ON public.collections(organization_id);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_logs_org ON public.bulk_upload_logs(organization_id);

-- Hot paths
CREATE INDEX IF NOT EXISTS idx_orders_org_status     ON public.orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_org_created_at ON public.orders(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dealers_org_status    ON public.dealers(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_seed_stock_org_seed   ON public.seed_stock(organization_id, seed_id);

-- ──────────────────────────────────────────────────────────────
-- Verify (run manually after migration):
--   SELECT COUNT(*) FROM public.profiles WHERE organization_id IS NULL;  -- 0
--   SELECT * FROM public.organizations;                                  -- 1 row
--   SELECT public.get_my_org_id();  -- as a logged-in user: default org UUID
-- ──────────────────────────────────────────────────────────────
