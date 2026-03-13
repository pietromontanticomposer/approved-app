BEGIN;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comments_parent_comment_id_fkey'
      AND conrelid = 'public.comments'::regclass
  ) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_parent_comment_id_fkey
      FOREIGN KEY (parent_comment_id)
      REFERENCES public.comments(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id
  ON public.comments(parent_comment_id);

COMMIT;
