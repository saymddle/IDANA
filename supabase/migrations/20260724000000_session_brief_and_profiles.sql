-- Session "brief" fields + a first-class profiles table.
-- Auth is handled by Clerk in the API routes (service-role client), so no RLS
-- here — mirrors 20260627000002_clerk_user_ids.sql (user_id is a Clerk text id).

-- ── Session brief / category ──────────────────────────────────────────────────
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS category   text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS brief      text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS hypothesis text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS method     text;

-- ── Profiles ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  user_id    text PRIMARY KEY,
  role       text,
  kitchen    text,
  location   text,
  focus      text,
  bio        text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
