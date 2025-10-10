-- Create API Request Logs Table
-- Tracks all API requests for monitoring, abuse detection, and analytics

CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Request identification
  request_id VARCHAR(255) NOT NULL,
  user_id UUID, -- NULL for anonymous requests
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,

  -- Client information
  ip_address INET,
  user_agent TEXT,

  -- Request metadata
  image_count INTEGER,
  has_valid_jwt BOOLEAN DEFAULT false,
  auth_source VARCHAR(20), -- 'jwt', 'body', 'none'
  request_metadata JSONB, -- grade, subject, category, language, etc.

  -- Response information
  response_status INTEGER,
  processing_time_ms INTEGER,
  error_code VARCHAR(50),

  -- Rate limiting info
  rate_limit_status VARCHAR(20), -- 'passed', 'exceeded'
  rate_limit_remaining INTEGER,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_request_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_has_jwt ON api_request_logs(has_valid_jwt);
CREATE INDEX IF NOT EXISTS idx_api_logs_response_status ON api_request_logs(response_status);
CREATE INDEX IF NOT EXISTS idx_api_logs_rate_limit_status ON api_request_logs(rate_limit_status);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_api_logs_user_endpoint_date
  ON api_request_logs(user_id, endpoint, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view logs (using service role)
-- Regular users cannot access logs
CREATE POLICY "Admins can view all logs"
  ON api_request_logs
  FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

-- Policy: System can insert logs
CREATE POLICY "System can insert logs"
  ON api_request_logs
  FOR INSERT
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE api_request_logs IS 'Logs all API requests for monitoring, security, and analytics purposes';
COMMENT ON COLUMN api_request_logs.has_valid_jwt IS 'Whether request included a valid JWT token';
COMMENT ON COLUMN api_request_logs.auth_source IS 'Source of user identification: jwt (from token), body (from request body), or none';
COMMENT ON COLUMN api_request_logs.rate_limit_status IS 'Whether request passed or exceeded rate limits';

-- Create function to auto-delete old logs (optional - keeps last 30 days)
CREATE OR REPLACE FUNCTION delete_old_api_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM api_request_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

COMMENT ON FUNCTION delete_old_api_logs IS 'Deletes API request logs older than 30 days to manage storage';

-- Create a scheduled job to run cleanup (if pg_cron is available)
-- This is optional and requires pg_cron extension
-- Uncomment if you have pg_cron enabled:
-- SELECT cron.schedule('cleanup-old-api-logs', '0 2 * * *', 'SELECT delete_old_api_logs()');
