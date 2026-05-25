-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 010: Enable Supabase Realtime
--
-- Adds the remaining tables to the supabase_realtime publication so
-- that Postgres change events are streamed to connected clients.
--
-- REPLICA IDENTITY FULL is required for UPDATE/DELETE events to
-- include the old row values (needed for cache invalidation).
-- ═══════════════════════════════════════════════════════════════

-- orders
ALTER TABLE public.orders       REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- order_items (item-level edits should also invalidate the order view)
ALTER TABLE public.order_items  REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- dealers
ALTER TABLE public.dealers      REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dealers;

-- seed_stock
ALTER TABLE public.seed_stock   REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.seed_stock;

-- challans (creation triggers an order status change)
ALTER TABLE public.challans     REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challans;
