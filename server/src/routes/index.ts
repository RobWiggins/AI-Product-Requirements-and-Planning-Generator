import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/http";
import { createGenerationJob, getGenerationJob, publicJob, runGeneration } from "../generation";

export const router = Router();

export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  status: "todo" | "done";
}

export interface UserStory {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  gherkin: string;
  tasks: Task[];
  priority: Priority;
  order: number;
}

export interface Epic {
  id: string;
  title: string;
  description: string;
  order: number;
  stories: UserStory[];
}

export interface ProjectBlueprint {
  goal: string;
  epics: Epic[];
}

router.get("/health", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
});

// Generation costs money: only signed-in users (guests included) may call it.
// POST returns immediately with a job id; GET polls until Claude finishes.
router.post(
  "/search",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const description =
      typeof req.body?.description === "string" ? req.body.description.trim() : "";
    if (!description) {
      res.status(400).json({ error: "Missing or invalid 'description'" });
      return;
    }

    const job = createGenerationJob(req.user!.id);
    void runGeneration(job, description);
    res.status(202).json({ jobId: job.id });
  }),
);

router.get(
  "/search/:jobId",
  requireAuth,
  (req: Request, res: Response) => {
    const job = getGenerationJob(req.params.jobId, req.user!.id);
    if (!job) {
      res.status(404).json({ error: "Generation not found" });
      return;
    }
    res.json(publicJob(job));
  },
);
