-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS login_logs (
  id SERIAL PRIMARY KEY,
  event VARCHAR(100) NOT NULL,
  emp_code VARCHAR(100) NOT NULL,
  device_name VARCHAR(255),
  android_version VARCHAR(50),
  mediadrm_id VARCHAR(255),
  android_id VARCHAR(255),
  app_version VARCHAR(50),
  login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
);

-- For existing tables that need to add latitude and longitude columns:
ALTER TABLE login_logs 
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_login_logs_emp_code ON login_logs (emp_code);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_time ON login_logs (login_time DESC);

-- ========================================================
-- OPTION 1: WITHOUT RLS (RECOMMENDED for Backend-Only API)
-- Since only your Express API connects to the database via DATABASE_URL,
-- RLS is not required.
-- ========================================================
ALTER TABLE login_logs DISABLE ROW LEVEL SECURITY;


-- ========================================================
-- OPTION 2: WITH RLS (If you want Supabase RLS enabled)
-- Note: Your Express API connects as the 'postgres' user which
-- automatically bypasses RLS anyway. But if you want RLS enabled:
-- ========================================================
-- ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow full access to service_role" ON login_logs
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);
