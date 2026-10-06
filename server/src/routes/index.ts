import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../lib/http";

export const router = Router();

function unwrapProjectBlueprint(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object") return parsed;
  const obj = parsed as Record<string, unknown>;
  if ("projectName" in obj && "epics" in obj) return obj;
  if ("ProjectBlueprint" in obj) return obj.ProjectBlueprint;
  const first = Array.isArray(obj.content) ? obj.content[0] : undefined;
  if (first && typeof first === "object") {
    const text = (first as { text?: unknown }).text;
    if (text && typeof text === "object") {
      const inner = text as Record<string, unknown>;
      if ("ProjectBlueprint" in inner) return inner.ProjectBlueprint;
      if ("projectName" in inner) return text;
    }
  }
  return parsed;
}

import Anthropic from "@anthropic-ai/sdk";
import { ProjectBlueprintSchema } from "../schemas/claudeResponse";
import { z } from "zod";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  authToken: process.env.CLAUDE_CODE_OAUTH_TOKEN,
});

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

const HEARTBEAT_MS = 10_000;

function sseComment(res: Response, text: string): void {
  if (!res.writableEnded) res.write(`: ${text}\n\n`);
}

function sseEvent(res: Response, event: string, data: unknown): void {
  if (res.writableEnded) return;
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function openGenerationStream(req: Request, res: Response): void {
  req.setTimeout(0);
  req.socket.setNoDelay(true);
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  // First byte immediately so Heroku's 30s H12 timer does not fire.
  sseComment(res, "ok");
}

// Generation costs money: only signed-in users (guests included) may call it.
// Streamed so Heroku sees bytes before the 30s router timeout.
router.get(
  "/search",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const projectDescription =
      typeof req.query.description === "string"
        ? decodeURIComponent(req.query.description)
        : undefined;

    if (projectDescription === undefined || typeof projectDescription !== "string") {
      res.status(400).json({ error: "Missing or invalid 'description' query parameter" });
      return;
    }

    const SYSTEM_PROMPT = `You are a senior product architect. Given a plain-text project description, generate a comprehensive ProjectBlueprint as a javascript object matching this schema exactly. Return an ONLY valid javascript object with no markdown fences, no explanation, no preamble.

Schema:
  "projectName": string,
  "description": string,
  "version": "1.0.0",
  "productRequirementsDocument": {
    "overview": string,
    "objectives": string[],
    "targetAudience": string,
    "successMetrics": string[],
    "scope": string,
    "outOfScope": string[]
  },
  "epics": [{ "epicId": "E-001", "title": string, "description": string, "priority": "High"|"Medium"|"Low" }],
  "userStories": [{ "storyId": "US-001", "epicId": string, "title": string, "asA": string, "iWant": string, "soThat": string, "priority": "High"|"Medium"|"Low", "acceptanceCriteria": string[] }],
  "gherkinScenarios": [{ "scenarioId": "SC-001", "storyId": string, "feature": string, "scenario": string, "given": string, "when": string, "then": string }],
  "tasks": [{ "taskId": "T-001", "storyId": string, "title": string, "description": string, "estimatedHours": number, "priority": "High"|"Medium"|"Low", "dependencies": string[] }],Ï
  "priorities": [{ "priorityId": "P-001", "level": "High"|"Medium"|"Low", "itemId": string, "rationale": string }]
}}

Rules:
- Generate 3-4 epics, 6 user stories, 1 gherkin scenario per story, 2 tasks per story
- epicIds: E-001, E-002... storyIds: US-001... scenarioIds: SC-001... taskIds: T-001...
- priorities array covers all epics and top-priority stories
- Be specific and realistic to the described project
- Return ONLY the JSON object}
`;

    openGenerationStream(req, res);

    const heartbeat = setInterval(() => sseComment(res, "ping"), HEARTBEAT_MS);
    heartbeat.unref();

    const jsonSchema = z.toJSONSchema(ProjectBlueprintSchema);
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: projectDescription }],
      output_config: {
        format: {
          type: "json_schema",
          schema: jsonSchema,
        },
      },
    });

    const abort = () => stream.abort();
    req.on("close", abort);
    stream.on("text", () => sseComment(res, "tok"));

    try {
      const response = await stream.finalMessage();

      if (response === null || response === undefined || Object.keys(response).length === 0) {
        sseEvent(res, "error", { error: "Invalid response from AI model" });
        return;
      }

      const firstBlock = response.content[0];
      const textValue = firstBlock && "text" in firstBlock ? firstBlock.text : undefined;
      let parsedText: unknown = null;
      let parseError: string | null = null;
      if (typeof textValue === "string") {
        try {
          parsedText = JSON.parse(textValue);
        } catch (err) {
          parseError = err instanceof Error ? err.message : String(err);
        }
      }

      if (typeof textValue !== "string") {
        sseEvent(res, "error", {
          error: "Server or third party dependencies could not process your request.",
        });
        return;
      }

      if (parseError || parsedText === null) {
        sseEvent(res, "error", {
          error:
            response.stop_reason === "max_tokens"
              ? "Model output was truncated before valid JSON completed. Retry with a smaller plan or higher max_tokens."
              : "Model output was not valid JSON.",
        });
        return;
      }

      const unwrapped = unwrapProjectBlueprint(parsedText);
      const blueprintParse = ProjectBlueprintSchema.safeParse(unwrapped);

      if (!blueprintParse.success) {
        sseEvent(res, "error", {
          error: "Model JSON did not match ProjectBlueprint schema.",
          issues: blueprintParse.error.issues,
        });
        return;
      }

      sseEvent(res, "result", { projectBlueprint: blueprintParse.data });
    } catch (err) {
      console.error(err);
      sseEvent(res, "error", { error: "Internal Server Error" });
    } finally {
      req.off("close", abort);
      clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    }
  }),
);
