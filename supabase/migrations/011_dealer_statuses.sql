-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 011: Dealer status model update
--
-- Old statuses: ACTIVE | INACTIVE | SUSPENDED
-- New statuses: ACTIVE | SUSPENDED | TERMINATED
--
-- Changes:
--   1. Migrate INACTIVE → SUSPENDED (inactive = currently not ordering, same as suspended)
--   2. Drop old CHECK constraint, add new one
-- ═══════════════════════════════════════════════════════════════

-- ── Step 1: Migrate existing data ────────────────────────────────
UPDATE public.dealers
SET status = 'SUSPENDED'
WHERE status = 'INACTIVE';

-- ── Step 2: Swap the CHECK constraint ────────────────────────────
DO $$
BEGIN
  ALTER TABLE public.dealers
    DROP CONSTRAINT IF EXISTS dealers_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END;
$$;

ALTER TABLE public.dealers
  ADD CONSTRAINT dealers_status_check
  CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TERMINATED'));
