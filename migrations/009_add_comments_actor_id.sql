-- 009_add_comments_actor_id.sql
-- Add actor_id column to comments for tracing who posted the comment

-- Add nullable uuid column to store the actor (user) id
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS actor_id uuid;

-- Add an index to speed up lookups by actor
CREATE INDEX IF NOT EXISTS idx_comments_actor_id ON public.comments (actor_id);

-- NOTE: avoid adding a foreign key constraint here to keep migration simple
-- and avoid cross-schema permission issues in some environments.
