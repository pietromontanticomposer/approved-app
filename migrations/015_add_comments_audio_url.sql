-- 015_add_comments_audio_url.sql
-- Add audio_url column to comments for voice notes

-- Add nullable text column to store the audio file path
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS audio_url text;

-- Add comment to document the column
COMMENT ON COLUMN public.comments.audio_url IS 'Storage path for voice comment audio file';
