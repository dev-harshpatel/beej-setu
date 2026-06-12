-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 026: Organization logos storage bucket
-- Run in: Supabase SQL editor (Project → SQL Editor → New query)
--
-- Public-read bucket for tenant logos. Writes happen exclusively
-- through the API with the service-role client (bypasses storage
-- RLS), so no INSERT/UPDATE/DELETE policies are defined here.
-- ═══════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-logos',
  'org-logos',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone may read logos (they render on the public login-adjacent UI)
DROP POLICY IF EXISTS "org_logos_public_read" ON storage.objects;
CREATE POLICY "org_logos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'org-logos');
