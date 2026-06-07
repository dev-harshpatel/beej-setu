-- Switch dealers from soft-delete to hard-delete.
-- Related rows in orders and collections keep their data; dealer_id is set to NULL.

-- orders: make dealer_id nullable, change FK to SET NULL
ALTER TABLE public.orders DROP CONSTRAINT orders_dealer_id_fkey;
ALTER TABLE public.orders ALTER COLUMN dealer_id DROP NOT NULL;
ALTER TABLE public.orders ADD CONSTRAINT orders_dealer_id_fkey
  FOREIGN KEY (dealer_id) REFERENCES public.dealers(id) ON DELETE SET NULL;

-- collections: make dealer_id nullable, change FK to SET NULL
ALTER TABLE public.collections DROP CONSTRAINT collections_dealer_id_fkey;
ALTER TABLE public.collections ALTER COLUMN dealer_id DROP NOT NULL;
ALTER TABLE public.collections ADD CONSTRAINT collections_dealer_id_fkey
  FOREIGN KEY (dealer_id) REFERENCES public.dealers(id) ON DELETE SET NULL;

-- Purge previously soft-deleted dealers (FK constraints are now SET NULL, so this is safe)
DELETE FROM public.dealers WHERE deleted_at IS NOT NULL;

-- Drop the RLS policy that depends on deleted_at, then recreate without the check
DROP POLICY IF EXISTS "dealers_select" ON public.dealers;
CREATE POLICY "dealers_select" ON public.dealers
  FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');

-- Drop the index on deleted_at
DROP INDEX IF EXISTS dealers_deleted_at_idx;

-- Remove the soft-delete column
ALTER TABLE public.dealers DROP COLUMN IF EXISTS deleted_at;
