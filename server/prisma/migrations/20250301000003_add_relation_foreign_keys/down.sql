ALTER TABLE user_stories DROP CONSTRAINT IF EXISTS user_stories_project_id_epic_id_fkey;
ALTER TABLE gherkin_scenarios DROP CONSTRAINT IF EXISTS gherkin_scenarios_project_id_story_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_id_story_id_fkey;
DROP INDEX IF EXISTS idx_priorities_project_id;
