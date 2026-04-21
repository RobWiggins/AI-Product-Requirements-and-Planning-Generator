import { Router, Request, Response } from "express";
import { pool } from "../db";

export const router = Router();

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ 
  apiKey: process.env.ANTHROPIC_API_KEY,
  authToken: process.env.CLAUDE_CODE_OAUTH_TOKEN 
});

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

  console.log('authToken:', process.env.CLAUDE_CODE_OAUTH_TOKEN)
  console.log('apiKey:', process.env.ANTHROPIC_API_KEY)

  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    messages: [{ role: "user", content: projectSearchParam }]
  });
  console.log('message- ', message);
  console.log(JSON.stringify(message.content), message.content);

  return res.status(200).json({ message: message.content });
})
