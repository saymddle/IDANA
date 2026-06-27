-- Switch user_id columns from Supabase UUID auth to Clerk text IDs

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE sessions ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE sessions ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE dishes DROP CONSTRAINT IF EXISTS dishes_user_id_fkey;
ALTER TABLE dishes ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE dishes ALTER COLUMN user_id TYPE text USING user_id::text;

-- Disable RLS — auth is now handled by Clerk in API routes
ALTER TABLE sessions            DISABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_objects      DISABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_edges        DISABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_versions     DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE dishes              DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions: owner select" ON sessions;
DROP POLICY IF EXISTS "sessions: owner insert" ON sessions;
DROP POLICY IF EXISTS "sessions: owner update" ON sessions;
DROP POLICY IF EXISTS "sessions: owner delete" ON sessions;
DROP POLICY IF EXISTS "sessions: public read"  ON sessions;
DROP POLICY IF EXISTS "canvas_objects: owner all"      ON canvas_objects;
DROP POLICY IF EXISTS "canvas_edges: owner all"        ON canvas_edges;
DROP POLICY IF EXISTS "canvas_versions: owner all"     ON canvas_versions;
DROP POLICY IF EXISTS "session_ingredients: owner all" ON session_ingredients;
DROP POLICY IF EXISTS "dishes: owner select" ON dishes;
DROP POLICY IF EXISTS "dishes: owner insert" ON dishes;
DROP POLICY IF EXISTS "dishes: owner update" ON dishes;
DROP POLICY IF EXISTS "dishes: owner delete" ON dishes;
