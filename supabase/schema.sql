-- Lego Master Database Schema
-- Execute this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ TABLES ============

-- Projects Table (user code projects)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  code TEXT NOT NULL DEFAULT '',
  language VARCHAR(20) NOT NULL DEFAULT 'python' CHECK (language IN ('python', 'blockly')),
  robot_model_id UUID,
  thumbnail_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Robot Models Table
CREATE TABLE robot_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_file_url TEXT NOT NULL,
  rigged_data JSONB NOT NULL,
  thumbnail_url TEXT,
  part_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tracks Table (FLL Competition Mats)
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season TEXT NOT NULL,
  model_url TEXT NOT NULL,
  mat_texture_url TEXT NOT NULL,
  mission_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simulation Sessions Table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  robot_model_id UUID REFERENCES robot_models(id) ON DELETE SET NULL,
  track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
  code_snapshot_id UUID REFERENCES code_snapshots(id) ON DELETE SET NULL,
  simulation_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Code Snapshots Table
CREATE TABLE code_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('python', 'blockly')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ INDEXES ============

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX idx_projects_is_public ON projects(is_public) WHERE is_public = true;

CREATE INDEX idx_robot_models_user_id ON robot_models(user_id);
CREATE INDEX idx_robot_models_created_at ON robot_models(created_at DESC);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_updated_at ON sessions(updated_at DESC);

CREATE INDEX idx_code_snapshots_session_id ON code_snapshots(session_id);

-- ============ ROW LEVEL SECURITY ============

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE robot_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Projects Policies
CREATE POLICY "Users can view own projects or public"
  ON projects FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Robot Models Policies
CREATE POLICY "Users can view their own robot models"
  ON robot_models FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own robot models"
  ON robot_models FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own robot models"
  ON robot_models FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own robot models"
  ON robot_models FOR DELETE
  USING (auth.uid() = user_id);

-- Sessions Policies
CREATE POLICY "Users can view their own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Code Snapshots Policies
CREATE POLICY "Users can view code snapshots of their sessions"
  ON code_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = code_snapshots.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert code snapshots"
  ON code_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = code_snapshots.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- Tracks Policies (public read)
CREATE POLICY "Everyone can view tracks"
  ON tracks FOR SELECT
  USING (true);

-- ============ FUNCTIONS ============

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for projects updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for sessions updated_at
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============ STORAGE BUCKETS ============

-- Create storage buckets (execute separately in Supabase Dashboard → Storage)
-- Bucket: robot-models (for .io/.ldr files)
-- Bucket: thumbnails (for robot preview images)
-- Bucket: track-assets (for 3D models and textures)

-- Storage Policies (to be set in Supabase Dashboard)
-- robot-models: authenticated users can upload
-- thumbnails: authenticated users can upload, public can read
-- track-assets: public read only

-- ============ SEED DATA ============

-- Insert default FLL tracks
INSERT INTO tracks (season, model_url, mat_texture_url, mission_elements) VALUES
(
  'FLL 2024 - MASTERPIECE',
  '/assets/tracks/fll-2024.glb',
  '/assets/tracks/fll-2024-mat.jpg',
  '[
    {
      "id": "M01-3d-cinema",
      "position": {"x": 0.5, "y": 0, "z": 0.3},
      "type": "lever",
      "trigger_force": 5,
      "points": 20
    },
    {
      "id": "M02-theater-scene",
      "position": {"x": -0.4, "y": 0, "z": 0.5},
      "type": "cargo",
      "points": 15
    }
  ]'::jsonb
),
(
  'FLL 2023 - SUPERPOWERED',
  '/assets/tracks/fll-2023.glb',
  '/assets/tracks/fll-2023-mat.jpg',
  '[]'::jsonb
);

-- ============ HELPFUL QUERIES ============

-- Get user's robot models with session count
-- SELECT
--   rm.*,
--   COUNT(s.id) as session_count
-- FROM robot_models rm
-- LEFT JOIN sessions s ON s.robot_model_id = rm.id
-- WHERE rm.user_id = auth.uid()
-- GROUP BY rm.id
-- ORDER BY rm.created_at DESC;

-- Get session with full details
-- SELECT
--   s.*,
--   rm.name as robot_name,
--   rm.thumbnail_url as robot_thumbnail,
--   t.season as track_season,
--   cs.code as current_code
-- FROM sessions s
-- JOIN robot_models rm ON rm.id = s.robot_model_id
-- JOIN tracks t ON t.id = s.track_id
-- LEFT JOIN code_snapshots cs ON cs.id = s.code_snapshot_id
-- WHERE s.user_id = auth.uid()
-- ORDER BY s.updated_at DESC;
