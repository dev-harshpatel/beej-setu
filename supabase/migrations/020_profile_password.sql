-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Migration 019: Encrypted password column in profiles
-- Stores AES-256-GCM ciphertext. Plain text is NEVER stored.
-- The decryption key lives only in the app server env var.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS encrypted_password TEXT;
