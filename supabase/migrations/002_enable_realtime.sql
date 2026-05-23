-- Enable Supabase Realtime on the profiles table.
-- REPLICA IDENTITY FULL is required so DELETE events include the full old row.
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
