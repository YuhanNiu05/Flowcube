-- FlowCube Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_stats table
-- Stores cumulative statistics for each user
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_duration INTEGER DEFAULT 0, -- Total focus time in seconds
  total_sessions INTEGER DEFAULT 0, -- Total number of sessions
  study_duration INTEGER DEFAULT 0, -- Study mode time in seconds
  exercise_duration INTEGER DEFAULT 0, -- Exercise mode time in seconds
  planet_stage INTEGER DEFAULT 0, -- Current planet stage (0-3)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create focus_sessions table
-- Stores individual focus sessions
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  duration INTEGER NOT NULL, -- Session duration in seconds
  mode TEXT DEFAULT 'study', -- 'study' or 'exercise'
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_completed_at ON focus_sessions(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- Function to update user_stats when a new session is added
CREATE OR REPLACE FUNCTION update_user_stats_on_session()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id, total_duration, total_sessions, study_duration, exercise_duration)
  VALUES (
    NEW.user_id,
    NEW.duration,
    1,
    CASE WHEN NEW.mode = 'study' THEN NEW.duration ELSE 0 END,
    CASE WHEN NEW.mode = 'exercise' THEN NEW.duration ELSE 0 END
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_duration = user_stats.total_duration + NEW.duration,
    total_sessions = user_stats.total_sessions + 1,
    study_duration = user_stats.study_duration + CASE WHEN NEW.mode = 'study' THEN NEW.duration ELSE 0 END,
    exercise_duration = user_stats.exercise_duration + CASE WHEN NEW.mode = 'exercise' THEN NEW.duration ELSE 0 END,
    updated_at = TIMEZONE('utc', NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update user_stats when a session is created
DROP TRIGGER IF EXISTS on_session_created ON focus_sessions;
CREATE TRIGGER on_session_created
  AFTER INSERT ON focus_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_session();

-- Function to calculate planet stage based on total focus time
CREATE OR REPLACE FUNCTION calculate_planet_stage(total_seconds INTEGER)
RETURNS INTEGER AS $$
DECLARE
  total_hours INTEGER;
BEGIN
  total_hours = total_seconds / 3600;
  
  IF total_hours >= 30 THEN
    RETURN 3; -- 心流期 (Flow Period)
  ELSIF total_hours >= 15 THEN
    RETURN 2; -- 生机期 (Vitality Period)
  ELSIF total_hours >= 5 THEN
    RETURN 1; -- 萌芽期 (Sprouting Period)
  ELSE
    RETURN 0; -- 荒芜期 (Barren Period)
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for user_stats
-- Users can only view their own stats
CREATE POLICY "Users can view own stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own stats
CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own stats
CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies for focus_sessions
-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON focus_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own sessions
CREATE POLICY "Users can create own sessions"
  ON focus_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
  ON focus_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON user_stats TO authenticated;
GRANT SELECT, INSERT, DELETE ON focus_sessions TO authenticated;

-- Comment: This schema provides:
-- 1. User authentication via Supabase Auth
-- 2. Individual user statistics tracking
-- 3. Focus session history
-- 4. Automatic stats updates via triggers
-- 5. Row-level security for data privacy
-- 6. Planet stage calculation based on focus time
