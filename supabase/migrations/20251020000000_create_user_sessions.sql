-- Create user_sessions table for analytics tracking
-- This table tracks user app opens/sessions for DAU, retention, and engagement metrics
-- Uses auth.users.id directly (students table is unused)

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- References auth.users.id (not students table)
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  platform TEXT, -- 'ios' | 'android' | 'web'
  app_version TEXT,
  device_info JSONB, -- Optional: device model, OS version, etc.
  is_new_user BOOLEAN DEFAULT FALSE, -- True if this is user's first session ever
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance (critical for analytics queries)
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_start ON user_sessions(session_start);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_heartbeat ON user_sessions(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_new_user ON user_sessions(is_new_user);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at);

-- RLS Policies (server-side only access)
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role has full access" ON user_sessions
  FOR ALL
  USING (true);

-- Comment for documentation
COMMENT ON TABLE user_sessions IS 'Tracks user sessions for DAU, retention, and engagement analytics. Updated via /api/session/heartbeat endpoint.';
COMMENT ON COLUMN user_sessions.user_id IS 'References auth.users.id (NOT students table which is unused)';
COMMENT ON COLUMN user_sessions.is_new_user IS 'TRUE if this is the user''s first session ever';
COMMENT ON COLUMN user_sessions.session_start IS 'When the session started';
COMMENT ON COLUMN user_sessions.last_heartbeat IS 'Last heartbeat received (for calculating session length)';
