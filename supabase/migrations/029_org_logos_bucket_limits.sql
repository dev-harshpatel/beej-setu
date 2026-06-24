-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 029: Widen org-logos bucket limits
-- Run in: Supabase SQL editor (Project → SQL Editor → New query)
--
-- Bumps the file size cap and adds GIF/SVG to the allowed types for
-- the org-logos bucket created in migration 026.
-- ═══════════════════════════════════════════════════════════════

UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
WHERE id = 'org-logos';
