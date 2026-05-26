-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 012: Enable Supabase Realtime
--
-- Adds the remaining tables to the supabase_realtime publication so
-- that Postgres change events are streamed to connected clients.
--
-- REPLICA IDENTITY FULL is required for UPDATE/DELETE events to
-- include the old row values (needed for cache invalidation).
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  tables TEXT[] := ARRAY['orders','order_items','dealers','seed_stock','challans'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Set REPLICA IDENTITY FULL unconditionally (idempotent)
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);

    -- Only add to publication if not already a member
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END;
$$;
