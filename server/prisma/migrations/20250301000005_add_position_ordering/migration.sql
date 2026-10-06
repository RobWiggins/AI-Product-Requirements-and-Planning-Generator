-- Preserve the display order of blueprint items across saves.
--
-- Rows written in one transaction share the same created_at, so it cannot be
-- used to reconstruct the order the user arranged epics/stories/tasks in.
-- `position` is the 0-based index within the project, set by the API on save.

ALTER TABLE epics             ADD COLUMN position integer NOT NULL DEFAULT 0;
ALTER TABLE user_stories      ADD COLUMN position integer NOT NULL DEFAULT 0;
ALTER TABLE gherkin_scenarios ADD COLUMN position integer NOT NULL DEFAULT 0;
ALTER TABLE tasks             ADD COLUMN position integer NOT NULL DEFAULT 0;
ALTER TABLE priorities        ADD COLUMN position integer NOT NULL DEFAULT 0;
