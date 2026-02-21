-- Migration: User Approval System
-- Requires admin approval before users can access the app

-- Table to track user approval status
CREATE TABLE IF NOT EXISTS user_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by TEXT,
  rejection_reason TEXT,
  approval_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_approvals_user_id ON user_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_approvals_status ON user_approvals(status);
CREATE INDEX IF NOT EXISTS idx_user_approvals_token ON user_approvals(approval_token);

-- RLS policies
ALTER TABLE user_approvals ENABLE ROW LEVEL SECURITY;

-- Only admins can view all approvals (we'll handle this via service role)
-- Users can only see their own approval status
CREATE POLICY "Users can view own approval" ON user_approvals
  FOR SELECT USING (auth.uid() = user_id);

-- No direct insert/update from users - only via service role
