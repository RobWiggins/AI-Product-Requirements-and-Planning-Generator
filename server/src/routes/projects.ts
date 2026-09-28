import { Router } from "express";
import { requireAuth } from "../auth/middleware";
import { asyncHandler, HttpError } from "../lib/http";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  replaceProject,
  StoredBlueprintSchema,
} from "../services/projectStore";

/**
 * /api/projects — the current user's saved blueprints.
 *
 *   GET    /        summaries, newest first
 *   POST   /        save a new blueprint            → 201 SavedProject
 *   GET    /:id     full blueprint
 *   PUT    /:id     replace a blueprint (autosave)  → SavedProject
 *   DELETE /:id                                     → 204
 *
 * Everything is scoped to req.user.id; another user's project is a 404.
 */
export const projectsRouter = Router();

projectsRouter.use(requireAuth);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseBlueprint(body: unknown) {
  const parsed = StoredBlueprintSchema.safeParse(body);
  if (!parsed.success) {
    const err = new HttpError(400, "Invalid project blueprint") as HttpError & { issues?: unknown };
    err.issues = parsed.error.issues;
    throw err;
  }
  return parsed.data;
}

function projectId(raw: string): string {
  if (!UUID_RE.test(raw)) throw new HttpError(404, "Project not found");
  return raw;
}

projectsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await listProjects(req.user!.id));
  }),
);

projectsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const saved = await createProject(req.user!.id, parseBlueprint(req.body));
    res.status(201).json(saved);
  }),
);

projectsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const project = await getProject(req.user!.id, projectId(req.params.id));
    if (!project) throw new HttpError(404, "Project not found");
    res.json(project);
  }),
);

projectsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const saved = await replaceProject(req.user!.id, projectId(req.params.id), parseBlueprint(req.body));
    if (!saved) throw new HttpError(404, "Project not found");
    res.json(saved);
  }),
);

projectsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const removed = await deleteProject(req.user!.id, projectId(req.params.id));
    if (!removed) throw new HttpError(404, "Project not found");
    res.status(204).end();
  }),
);
