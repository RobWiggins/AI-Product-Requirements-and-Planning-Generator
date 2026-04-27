import { Router, Request, Response } from "express";
import { pool } from "../db";

export const router = Router();

import Anthropic from "@anthropic-ai/sdk";
import { ClaudeResponseSchema } from "../schemas/claudeResponse";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  authToken: process.env.CLAUDE_CODE_OAUTH_TOKEN,
});

// TODO put somewhere else
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

router.get("/items", async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    "SELECT * FROM items ORDER BY created_at DESC",
  );
  res.json(rows);
});

router.get("/search", async (req: Request, res: Response) => {
  const projectDescription =
    typeof req.query.description === "string"
      ? decodeURIComponent(req.query.description)
      : undefined;

  console.log(projectDescription);

  if (
    projectDescription === undefined ||
    typeof projectDescription !== "string"
  ) {
    return res
      .status(400)
      .json({ error: "Missing or invalid 'description' query parameter" });
  }

  // const finalPrompt = `Product plan: ${projectSearchParam}. Return separate entries for: Product Requirements Document, User Stories,
  //   Requirements, Acceptance Criteria, Gherkin, Tasks, and Priorities. Ensure the response is formatted
  //    as JSON, and that it adheres to the schema provided in the documentation. The Schema and interfaces is as follows: ProjectBlueprint, Epic, UserStory, Task, Priority.
  //    remove new line characters from the response, and ensure it is properly escaped so that it can be parsed as JSON by the client.`;

  const SYSTEM_PROMPT = `You are a senior product architect. Given a plain-text project description, generate a comprehensive ProjectBlueprint as a JSON object matching this schema exactly. Return ONLY valid JSON with no markdown fences, no explanation, no preamble.

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
- Generate 3-5 epics, 6-10 user stories, 1-2 gherkin scenarios per story, 2-4 tasks per story
- epicIds: E-001, E-002... storyIds: US-001... scenarioIds: SC-001... taskIds: T-001...
- priorities array covers all epics and top-priority stories
- Be specific and realistic to the described project
- Return ONLY the JSON object}
`;

  // const message = await client.messages.create({
  //   model: "claude-opus-4-7",
  //   max_tokens: 8192,
  //   messages: [{ role: "user", content: finalPrompt }],
  //   output_config: {
  //     format: {
  //       type: "json_schema",
  //       schema: {
  //         type: "object",
  //         properties: {
  //           key_points: {
  //             type: "array",
  //             items: { type: "string" },
  //           },
  //         },
  //         required: ["key_points"],
  //         additionalProperties: false,
  //       },
  //     },
  //     effort: "high",
  //   },
  // });

  const headers = new Headers({
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY || "missing", // TODO fix
    "anthropic-version": "2023-06-01",
    "dangerouslyAllowBrowser": "true", // TODO fix
    // "method": "POST",
  });

  // const response = await fetch("https://api.anthropic.com/v1/messages", {
  //   headers,
  //   body: JSON.stringify({
  //     model: "claude-sonnet-4-20250514",
  //     max_tokens: 6000,
  //     system: SYSTEM_PROMPT, // the prompt above
  //     messages: [
  //       { role: "user", content: projectDescription }, // the user's plain-text input
  //     ],
  //   }),
  // });

  const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 6000,
      system: SYSTEM_PROMPT, // the prompt above
      messages: [
        { role: "user", content: projectDescription }, // the user's plain-text input
      ],
    })

    // TODO make response syntax clearer (coalescing)
    if (response === null || response === undefined || Object.keys(response).length === 0) {
      return res.status(400).json({ error: "Invalid response from AI model" });
    }

  // const data =  response.json()
  console.log("Raw response ---", response);
  // const raw = data.content.map((c: { text?: string }) => c.text ?? "").join("");
  // TODO assume type here?
  const blueprint = ClaudeResponseSchema.safeParse(response);

  // const isEmpty = (obj: object): boolean => Object.keys(obj).length === 0;

  // if (
  //   isEmpty(data) ||
  //   !data.content ||
  //   !Array.isArray(data.content) ||
  //   data.content.length === 0
  // ) {
  //   return res.status(400).json({ error: "Invalid response from AI model" });
  // }ß

  // const raw = data.content.map((c: { text?: string }) => c.text ?? "").join("");
  // const blueprint: ProjectBlueprint = JSON.parse(raw);

  console.log("blueprint ---", blueprint);

  return res.status(200).json({ blueprint });
  // message: JSON.parse(message.)
  // });
});
