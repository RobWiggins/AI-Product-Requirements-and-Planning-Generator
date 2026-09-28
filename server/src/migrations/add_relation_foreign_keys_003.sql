-- Make the business-id relationships real foreign keys so Prisma can navigate
--   epic.userStories, userStory.gherkinScenarios, userStory.tasks
-- and the database rejects orphaned children.
--
-- epicId / storyId are text ids ("E-001", "US-001") that are unique per
-- project, so each FK is composite on (project_id, <parent_id>) and targets
-- the matching UNIQUE constraint created in migration 001.
--
-- ON UPDATE CASCADE: renaming an epic_id / story_id propagates to children.
-- ON DELETE CASCADE: deleting an epic removes its stories, scenarios, tasks.
--
-- Generated with:
--   npm run prisma:diff --workspace=server
-- Run after create_product_requirements_documents_002.sql:
--   psql -U storyflow -d storyflow -f server/src/migrations/add_relation_foreign_keys_003.sql

ALTER TABLE user_stories
  ADD CONSTRAINT user_stories_project_id_epic_id_fkey
  FOREIGN KEY (project_id, epic_id)
  REFERENCES epics(project_id, epic_id)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE gherkin_scenarios
  ADD CONSTRAINT gherkin_scenarios_project_id_story_id_fkey
  FOREIGN KEY (project_id, story_id)
  REFERENCES user_stories(project_id, story_id)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_project_id_story_id_fkey
  FOREIGN KEY (project_id, story_id)
  REFERENCES user_stories(project_id, story_id)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- priorities was the only child table without a project_id index.
CREATE INDEX idx_priorities_project_id ON priorities(project_id);
