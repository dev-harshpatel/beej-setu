-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 004: Crops + Seed Products
-- Run in: Supabase SQL Editor (Project → SQL Editor → New query)
-- Replaces the placeholder seeds/seed_categories schema.
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- Table: crops
-- One row per crop type (Pearlmillet, Maize, Castor, …)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.crops (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER crops_updated_at
  BEFORE UPDATE ON public.crops
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crops_select"
  ON public.crops FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "crops_write_admin"
  ON public.crops FOR ALL
  USING (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- ──────────────────────────────────────────────────────────────
-- Table: seed_products
-- Each row = one crop × variety × pack_size combination.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.seed_products (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_id         UUID    NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
  variety         TEXT    NOT NULL,
  pack_size       TEXT    NOT NULL,       -- "1.5 kg", "4 kg", "500 g", "250 g", "5 kg"
  packets_per_bag INTEGER NOT NULL CHECK (packets_per_bag > 0),
  status          TEXT    NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE (crop_id, variety, pack_size)
);

CREATE INDEX seed_products_crop_id_idx   ON public.seed_products(crop_id);
CREATE INDEX seed_products_status_idx    ON public.seed_products(status);
CREATE INDEX seed_products_deleted_at_idx ON public.seed_products(deleted_at);

CREATE TRIGGER seed_products_updated_at
  BEFORE UPDATE ON public.seed_products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.seed_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seed_products_select"
  ON public.seed_products FOR SELECT
  USING (deleted_at IS NULL AND auth.role() = 'authenticated');

CREATE POLICY "seed_products_write_admin"
  ON public.seed_products FOR ALL
  USING (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));
