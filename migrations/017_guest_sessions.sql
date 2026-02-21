-- Migration 017: Guest Sessions for anonymous link access
-- Allows share links to be used by guests with just a nickname (no account required)

-- Add guest_enabled flag to share_links
ALTER TABLE share_links ADD COLUMN IF NOT EXISTS guest_enabled BOOLEAN DEFAULT false;

-- Create guest_sessions table
CREATE TABLE IF NOT EXISTS guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to the share_link that created this session
  share_link_id UUID NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,

  -- Session token (SHA256 hash of the raw token)
  session_token_hash TEXT NOT NULL,

  -- Nickname chosen by the guest
  nickname TEXT NOT NULL,

  -- Project this session has access to (denormalized for fast queries)
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Role inherited from share_link (viewer or commenter only)
  role TEXT NOT NULL DEFAULT 'commenter' CHECK (role IN ('viewer', 'commenter')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  last_active_at TIMESTAMPTZ DEFAULT now(),

  -- For manual invalidation
  revoked_at TIMESTAMPTZ NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_sessions_token ON guest_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_project ON guest_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_share_link ON guest_sessions(share_link_id);

-- Constraint: only one guest per share_link (single-use)
CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_sessions_share_link_unique ON guest_sessions(share_link_id);

-- Add column to track guest comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS guest_session_id UUID REFERENCES guest_sessions(id) ON DELETE SET NULL;

-- RLS Policies for guest_sessions
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access on guest_sessions"
  ON guest_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);
