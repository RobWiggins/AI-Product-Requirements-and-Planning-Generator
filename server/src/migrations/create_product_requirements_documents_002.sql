-- Product Requirements Document (PRD): one row per project.
--
-- Mirrors ProductRequirementsDocumentSchema in server/src/schemas/claudeResponse.ts:
--   overview, objectives[], targetAudience, successMetrics[], scope, outOfScope[]
--
-- Run after create_project_tables.sql:
--   psql -U storyflow -d storyflow -f server/src/migrations/create_product_requirements_documents.sql

CREATE TABLE product_requirements_documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 1:1 with projects. UNIQUE enforces a single PRD per project; CASCADE
  -- removes the PRD when its project is deleted.
  project_id       uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  overview         text NOT NULL DEFAULT '',
  target_audience  text NOT NULL DEFAULT '',
  scope            text NOT NULL DEFAULT '',
  -- String lists are stored as jsonb arrays, matching acceptance_criteria /
  -- dependencies elsewhere in the schema.
  objectives       jsonb NOT NULL DEFAULT '[]'::jsonb
                   CHECK (jsonb_typeof(objectives) = 'array'),
  success_metrics  jsonb NOT NULL DEFAULT '[]'::jsonb
                   CHECK (jsonb_typeof(success_metrics) = 'array'),
  out_of_scope     jsonb NOT NULL DEFAULT '[]'::jsonb
                   CHECK (jsonb_typeof(out_of_scope) = 'array'),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Supports the GET /product_requirements_documents?projectId=<uuid> lookup.
-- (The UNIQUE constraint above already creates an index on project_id.)

-- Keep updated_at current on every UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prd_set_updated_at
  BEFORE UPDATE ON product_requirements_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Backfill from the legacy projects.prd jsonb column so existing projects
-- get a PRD row. Safe to re-run: skips projects that already have one.
INSERT INTO product_requirements_documents
  (project_id, overview, target_audience, scope, objectives, success_metrics, out_of_scope)
SELECT
  p.id,
  COALESCE(p.prd ->> 'overview', ''),
  COALESCE(p.prd ->> 'targetAudience', ''),
  COALESCE(p.prd ->> 'scope', ''),
  COALESCE(p.prd -> 'objectives', '[]'::jsonb),
  COALESCE(p.prd -> 'successMetrics', '[]'::jsonb),
  COALESCE(p.prd -> 'outOfScope', '[]'::jsonb)
FROM projects p
WHERE p.prd <> '{}'::jsonb
  AND NOT EXISTS (
    SELECT 1 FROM product_requirements_documents d WHERE d.project_id = p.id
  );

-- Once the API reads PRDs from this table instead of projects.prd, retire the
-- legacy column:
-- ALTER TABLE projects DROP COLUMN prd;

GRANT ALL PRIVILEGES ON TABLE product_requirements_documents TO storyflow;
