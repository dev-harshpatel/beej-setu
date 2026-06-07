-- Allow dealers to be created without a contact number.
-- Admins can fill in missing contact details later via the edit dialog.
ALTER TABLE public.dealers ALTER COLUMN contact DROP NOT NULL;
