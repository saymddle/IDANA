-- Migration: Private accounts
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- It is idempotent — safe to run more than once.

-- ─── 1. Add user_id to sessions ──────────────────────────────────────────────
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Back-fill any existing rows that predate this column (optional — delete them if you prefer a clean slate)
-- UPDATE sessions SET user_id = '<your-user-uuid>' WHERE user_id IS NULL;

-- Make user_id required going forward and default to the calling user
ALTER TABLE sessions
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;  -- comment this line out if you have un-backfilled rows

-- ─── 2. Add user_id to dishes ────────────────────────────────────────────────
ALTER TABLE dishes
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE dishes
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- ─── 3. Enable RLS on every user-owned table ─────────────────────────────────
ALTER TABLE sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_objects    ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_edges      ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes            ENABLE ROW LEVEL SECURITY;

-- ─── 4. sessions policies ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sessions: owner select"  ON sessions;
DROP POLICY IF EXISTS "sessions: owner insert"  ON sessions;
DROP POLICY IF EXISTS "sessions: owner update"  ON sessions;
DROP POLICY IF EXISTS "sessions: owner delete"  ON sessions;
DROP POLICY IF EXISTS "sessions: public read"   ON sessions;

-- Owner has full access
CREATE POLICY "sessions: owner select"  ON sessions FOR SELECT  USING       (auth.uid() = user_id);
CREATE POLICY "sessions: owner insert"  ON sessions FOR INSERT  WITH CHECK   (auth.uid() = user_id);
CREATE POLICY "sessions: owner update"  ON sessions FOR UPDATE  USING        (auth.uid() = user_id);
CREATE POLICY "sessions: owner delete"  ON sessions FOR DELETE  USING        (auth.uid() = user_id);

-- Anyone can read published sessions (for the /explore feed)
CREATE POLICY "sessions: public read"   ON sessions FOR SELECT  USING        (published = true);

-- ─── 5. canvas_objects policies (scoped via session ownership) ───────────────
DROP POLICY IF EXISTS "canvas_objects: owner all" ON canvas_objects;

CREATE POLICY "canvas_objects: owner all" ON canvas_objects
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = canvas_objects.session_id
        AND sessions.user_id = auth.uid()
    )
  );

-- ─── 6. canvas_edges policies ────────────────────────────────────────────────
DROP POLICY IF EXISTS "canvas_edges: owner all" ON canvas_edges;

CREATE POLICY "canvas_edges: owner all" ON canvas_edges
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = canvas_edges.session_id
        AND sessions.user_id = auth.uid()
    )
  );

-- ─── 7. canvas_versions policies ─────────────────────────────────────────────
DROP POLICY IF EXISTS "canvas_versions: owner all" ON canvas_versions;

CREATE POLICY "canvas_versions: owner all" ON canvas_versions
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = canvas_versions.session_id
        AND sessions.user_id = auth.uid()
    )
  );

-- ─── 8. session_ingredients policies ─────────────────────────────────────────
DROP POLICY IF EXISTS "session_ingredients: owner all" ON session_ingredients;

CREATE POLICY "session_ingredients: owner all" ON session_ingredients
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_ingredients.session_id
        AND sessions.user_id = auth.uid()
    )
  );

-- ─── 9. dishes policies ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "dishes: owner select"  ON dishes;
DROP POLICY IF EXISTS "dishes: owner insert"  ON dishes;
DROP POLICY IF EXISTS "dishes: owner update"  ON dishes;
DROP POLICY IF EXISTS "dishes: owner delete"  ON dishes;

CREATE POLICY "dishes: owner select"  ON dishes FOR SELECT  USING       (auth.uid() = user_id);
CREATE POLICY "dishes: owner insert"  ON dishes FOR INSERT  WITH CHECK   (auth.uid() = user_id);
CREATE POLICY "dishes: owner update"  ON dishes FOR UPDATE  USING        (auth.uid() = user_id);
CREATE POLICY "dishes: owner delete"  ON dishes FOR DELETE  USING        (auth.uid() = user_id);
