-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 003: Dealers Table
-- Run in: Supabase SQL Editor (Project → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.dealers (
  id                           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                         TEXT NOT NULL,
  staff_id                     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  contact                      TEXT NOT NULL,
  default_transport            TEXT,
  default_delivery_instruction TEXT,
  delivery_instruction         TEXT,
  territory                    TEXT,
  status                       TEXT NOT NULL DEFAULT 'ACTIVE'
                                 CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  notes                        TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                   TIMESTAMPTZ
);

CREATE INDEX dealers_staff_id_idx ON public.dealers(staff_id);
CREATE INDEX dealers_status_idx   ON public.dealers(status);
CREATE INDEX dealers_deleted_at_idx ON public.dealers(deleted_at);

CREATE TRIGGER dealers_updated_at
  BEFORE UPDATE ON public.dealers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ──────────────────────────────────────────────────────────────
-- RLS: dealers
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view non-deleted dealers
CREATE POLICY "dealers_select"
  ON public.dealers FOR SELECT
  USING (deleted_at IS NULL AND auth.role() = 'authenticated');

-- Only admins can insert/update/delete
CREATE POLICY "dealers_insert_admin"
  ON public.dealers FOR INSERT
  WITH CHECK (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY "dealers_update_admin"
  ON public.dealers FOR UPDATE
  USING (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY "dealers_delete_admin"
  ON public.dealers FOR DELETE
  USING (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));
