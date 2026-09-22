CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_name  text NOT NULL,
  description   text NOT NULL DEFAULT '',
  version       text NOT NULL DEFAULT '1.0.0',
  prd           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE epics (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  epic_id     text NOT NULL,
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority    text NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, epic_id)
);

CREATE TABLE user_stories (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  story_id             text NOT NULL,
  epic_id              text NOT NULL,
  title                text NOT NULL,
  as_a                 text NOT NULL DEFAULT '',
  i_want               text NOT NULL DEFAULT '',
  so_that              text NOT NULL DEFAULT '',
  priority             text NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
  acceptance_criteria  jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, story_id)
);

CREATE TABLE gherkin_scenarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scenario_id text NOT NULL,
  story_id    text NOT NULL,
  feature     text NOT NULL DEFAULT '',
  scenario    text NOT NULL DEFAULT '',
  given_step  text NOT NULL DEFAULT '',
  when_step   text NOT NULL DEFAULT '',
  then_step   text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, scenario_id)
);

CREATE TABLE tasks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id          text NOT NULL,
  story_id         text NOT NULL,
  title            text NOT NULL,
  description      text NOT NULL DEFAULT '',
  estimated_hours  numeric NOT NULL DEFAULT 0,
  priority         text NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
  dependencies     jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed        boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, task_id)
);

CREATE TABLE priorities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  priority_id text NOT NULL,
  level       text NOT NULL CHECK (level IN ('High', 'Medium', 'Low')),
  item_id     text NOT NULL,
  rationale   text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, priority_id)
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_epics_project_id ON epics(project_id);
CREATE INDEX idx_stories_project_id ON user_stories(project_id);
CREATE INDEX idx_gherkin_project_id ON gherkin_scenarios(project_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO storyflow;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO storyflow;
