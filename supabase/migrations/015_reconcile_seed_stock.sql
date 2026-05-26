-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 015: Reconcile seed_stock with ledger
-- Run in: Supabase SQL editor (Project → SQL Editor → New query)
--
-- Problem: seed_stock (what approve_order reads for FIFO deduction)
--          can drift out of sync with stock_movements (the ledger).
--          This migration re-computes the running balance from the ledger
--          and writes it back into seed_stock so approvals work again.
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- Step 1: Show current discrepancies (run this first to diagnose)
-- ──────────────────────────────────────────────────────────────
-- Uncomment and run this block alone to inspect before applying the fix:
--
-- SELECT
--   sm.seed_id,
--   sm.batch_number,
--   sp.variety,
--   sp.packets_per_bag,
--   SUM(CASE WHEN sm.movement_type IN ('ADD','ADJUSTMENT_IN') THEN sm.quantity_packets
--            ELSE -sm.quantity_packets END) AS ledger_packets,
--   COALESCE(ss.bag_stock, 0)    AS ss_bags,
--   COALESCE(ss.packet_stock, 0) AS ss_packets,
--   COALESCE(ss.bag_stock * sp.packets_per_bag + ss.packet_stock, 0) AS ss_total_packets
-- FROM public.stock_movements sm
-- JOIN public.seed_products sp ON sp.id = sm.seed_id
-- LEFT JOIN public.seed_stock ss ON ss.seed_id = sm.seed_id AND ss.batch_number = sm.batch_number
-- GROUP BY sm.seed_id, sm.batch_number, sp.variety, sp.packets_per_bag, ss.bag_stock, ss.packet_stock
-- ORDER BY sm.seed_id, sm.batch_number;

-- ──────────────────────────────────────────────────────────────
-- Step 2: Suppress the manual-change trigger so we don't
--         double-log these corrective writes into stock_movements
-- ──────────────────────────────────────────────────────────────
SELECT set_config('app.in_deduction', 'true', true);

-- ──────────────────────────────────────────────────────────────
-- Step 3: Upsert seed_stock rows to match the ledger balance
-- ──────────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────────
-- Step 4: Re-enable the trigger
-- ──────────────────────────────────────────────────────────────
SELECT set_config('app.in_deduction', 'false', true);

-- ──────────────────────────────────────────────────────────────
-- Step 5: Verify — should show is_reconciled = true for all rows
-- ──────────────────────────────────────────────────────────────
-- SELECT
--   ss.seed_id,
--   ss.batch_number,
--   sp.variety,
--   ss.bag_stock,
--   ss.packet_stock,
--   ss.bag_stock * sp.packets_per_bag + ss.packet_stock AS total_packets
-- FROM public.seed_stock ss
-- JOIN public.seed_products sp ON sp.id = ss.seed_id
-- ORDER BY ss.seed_id, ss.batch_number;
