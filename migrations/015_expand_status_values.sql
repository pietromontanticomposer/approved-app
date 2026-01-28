-- Migration 015: Expand status values for cues/versions
-- Aligns DB constraints with review workflow states and underscore variants

BEGIN;

ALTER TABLE cues DROP CONSTRAINT IF EXISTS cues_status_check;
ALTER TABLE versions DROP CONSTRAINT IF EXISTS versions_status_check;

ALTER TABLE cues
  ADD CONSTRAINT cues_status_check CHECK (
    status in (
      'in-review',
      'in_review',
      'review_completed',
      'in_revision',
      'approved',
      'changes-requested',
      'changes_requested'
    )
  );

ALTER TABLE versions
  ADD CONSTRAINT versions_status_check CHECK (
    status in (
      'in-review',
      'in_review',
      'review_completed',
      'in_revision',
      'approved',
      'changes-requested',
      'changes_requested'
    )
  );

ALTER TABLE cues ALTER COLUMN status SET DEFAULT 'in_review';
ALTER TABLE versions ALTER COLUMN status SET DEFAULT 'in_review';

COMMIT;
