-- Run this command in your Supabase SQL Editor to add the missing column
ALTER TABLE dostawcy_ict ADD COLUMN zakres_umowy JSONB DEFAULT '[]'::jsonb;
