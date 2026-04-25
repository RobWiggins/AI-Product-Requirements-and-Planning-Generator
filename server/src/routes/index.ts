import { Router, Request, Response } from "express";
import { pool } from "../db";

export const router = Router();

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  authToken: process.env.CLAUDE_CODE_OAUTH_TOKEN
});

// TODO put somewherre else
export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'done';
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

router.get("/items", async (_req: Request, res: Response) => {
  const { rows } = await pool.query("SELECT * FROM items ORDER BY created_at DESC");
  res.json(rows);
});

router.get("/search", async (req: Request, res: Response) => {
  const projectSearchParam = typeof req.query.description === "string" ? decodeURIComponent(req.query.description) : undefined

  console.log(projectSearchParam);

  if (projectSearchParam === undefined || typeof projectSearchParam !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'description' query parameter" });
  }

  const finalPrompt = `Product plan: ${projectSearchParam}. Return separate entries for: Product Requirements Document, User Stories,
    Requirements, Acceptance Criteria, Gherkin, Tasks, and Priorities. Ensure the response is formatted
     as JSON, and that it adheres to the schema provided in the documentation. The Schema and interfaces is as follows: ProjectBlueprint, Epic, UserStory, Task, Priority.
     remove new line characters from the response, and ensure it is properly escaped so that it can be parsed as JSON by the client.`;

  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 8192,
    messages: [{ role: "user", content: finalPrompt }]
  });
  console.log('message- ', message);
  console.log(JSON.stringify(message.content), message.content);

  return res.status(200).json({ message: message.content });
})
