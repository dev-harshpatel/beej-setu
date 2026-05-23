-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Seed 005: Initial Seed Stock
-- Requires: 004_seed_products migration + 003_seed_products seed
-- Run AFTER migration 006_seed_stock.sql
-- ═══════════════════════════════════════════════════════════════
-- Every seed product gets one batch (B2025-001) with
-- 10 bags and 5 loose packets as opening stock.
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_admin_id UUID;
  r          RECORD;
BEGIN
  SELECT id INTO v_admin_id
  FROM public.profiles
  WHERE role IN ('SUPER_ADMIN', 'ADMIN')
  ORDER BY created_at ASC
  LIMIT 1;

  FOR r IN SELECT id FROM public.seed_products WHERE deleted_at IS NULL LOOP
    INSERT INTO public.seed_stock (seed_id, batch_number, bag_stock, packet_stock, last_updated_by)
    VALUES (r.id, 'B2025-001', 10, 5, v_admin_id)
    ON CONFLICT (seed_id, batch_number) DO NOTHING;
  END LOOP;
END $$;
