-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 021: Bulk upload audit log
-- Records every bulk-import operation (dealers or stock) with
-- the full per-row result set so imports are always traceable.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.bulk_upload_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_type    TEXT        NOT NULL CHECK (upload_type IN ('dealers', 'stock')),
  uploaded_by    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_rows     INTEGER     NOT NULL,
  success_count  INTEGER     NOT NULL,
  failure_count  INTEGER     NOT NULL,
  results        JSONB       NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying by uploader and type
CREATE INDEX IF NOT EXISTS bulk_upload_logs_uploaded_by_idx ON public.bulk_upload_logs (uploaded_by);
CREATE INDEX IF NOT EXISTS bulk_upload_logs_upload_type_idx ON public.bulk_upload_logs (upload_type);
CREATE INDEX IF NOT EXISTS bulk_upload_logs_created_at_idx  ON public.bulk_upload_logs (created_at DESC);

-- RLS: only admins (via service role) write; admins can read
ALTER TABLE public.bulk_upload_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read bulk_upload_logs"
  ON public.bulk_upload_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'SUPER_ADMIN')
      AND is_active = true
    )
  );
