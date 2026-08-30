export const schemaSql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('multiple_choice','multiple_select','short_answer','code_output','code_fix','image','true_false')),
  category TEXT NOT NULL DEFAULT 'General',
  difficulty TEXT NOT NULL DEFAULT 'Easy',
  points INTEGER NOT NULL DEFAULT 10 CHECK (points >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 1 CHECK (max_attempts > 0),
  penalty INTEGER NOT NULL DEFAULT 0 CHECK (penalty >= 0),
  explanation TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  answer JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  difficulty TEXT NOT NULL DEFAULT 'Easy',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  selection_mode TEXT NOT NULL DEFAULT 'manual' CHECK (selection_mode IN ('manual','random')),
  random_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_message TEXT NOT NULL DEFAULT '',
  completion_message TEXT NOT NULL DEFAULT '',
  require_name BOOLEAN NOT NULL DEFAULT FALSE,
  leaderboard_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reveal_answers BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Normalize legacy rows that stored one random rule as an object instead of an array.
UPDATE challenges
SET random_rules = CASE jsonb_typeof(random_rules)
  WHEN 'array' THEN random_rules
  WHEN 'object' THEN CASE
    WHEN random_rules = '{}'::jsonb THEN '[]'::jsonb
    ELSE jsonb_build_array(random_rules)
  END
  ELSE '[]'::jsonb
END
WHERE jsonb_typeof(random_rules) IS DISTINCT FROM 'array';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'challenges_random_rules_array'
  ) THEN
    ALTER TABLE challenges
      ADD CONSTRAINT challenges_random_rules_array
      CHECK (jsonb_typeof(random_rules) = 'array');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS challenge_questions (
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (challenge_id, question_id)
);

CREATE TABLE IF NOT EXISTS challenge_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
  challenge_title TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Guest',
  current_index INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  total_possible INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS session_questions (
  session_id UUID NOT NULL REFERENCES challenge_sessions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  question_id UUID,
  snapshot JSONB NOT NULL,
  attempts_used INTEGER NOT NULL DEFAULT 0,
  is_correct BOOLEAN,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, position)
);

CREATE TABLE IF NOT EXISTS answer_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES challenge_sessions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  attempt_number INTEGER NOT NULL,
  submitted_answer JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_challenge ON challenge_sessions(challenge_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_filters ON questions(category, difficulty, type, is_active);
`;
