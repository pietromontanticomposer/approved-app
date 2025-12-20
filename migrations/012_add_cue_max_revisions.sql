-- Add max revisions per cue
ALTER TABLE cues
ADD COLUMN IF NOT EXISTS max_revisions integer;
