import { Router, Request, Response } from "express";
import { pool } from "../db";

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
import {
  ClaudeResponseSchema,
  ProjectBlueprintSchema,
} from "../schemas/claudeResponse";
import { string, z } from "zod";
import assert from "assert";

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

  // ? Need ???
  const headers = new Headers({
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY || "missing", // TODO fix
    "anthropic-version": "2023-06-01",
    dangerouslyAllowBrowser: "true", // TODO fix
    // "method": "POST",
  });

  const jsonSchema = z.toJSONSchema(ProjectBlueprintSchema);  


  // ? can probably remove as not needed
  // const extractionTool: Anthropic.Messages.Tool = {
  //   name: "project_blueprint_extractor",
  //   description: "Extracts a structured ProjectBlueprint from the AI's response",
  //   input_schema: jsonSchema as any,
  // }

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: projectDescription }, // the user's plain-text input
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: jsonSchema,
      },
    }
  });

  // TODO make response syntax clearer (coalescing)
  if (
    response === null ||
    response === undefined ||
    Object.keys(response).length === 0
  ) {
    return res.status(400).json({ error: "Invalid response from AI model" });
  }

  const firstBlock = response.content[0];
  const textValue = firstBlock && "text" in firstBlock ? firstBlock.text : undefined;
  const envelopeParse = ClaudeResponseSchema.safeParse(response);
  let parsedText: unknown = null;
  let parseError: string | null = null;
  if (typeof textValue === "string") {
    try {
      parsedText = JSON.parse(textValue);
    } catch (err) {
      parseError = err instanceof Error ? err.message : String(err);
    }
  }
  const parsedKeys =
    parsedText && typeof parsedText === "object" && parsedText !== null
      ? Object.keys(parsedText as object)
      : [];
  // #region agent log
  fetch("http://127.0.0.1:7347/ingest/2ac28a71-ef8c-4fc1-907c-5f99302f68ea", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "f31864",
    },
    body: JSON.stringify({
      sessionId: "f31864",
      runId: "pre-fix",
      hypothesisId: "A",
      location: "server/src/routes/index.ts:after-messages-create",
      message: "Anthropic content[0].text type vs envelope schema",
      data: {
        stopReason: response.stop_reason,
        contentTypes: response.content.map((c) => c.type),
        textType: typeof textValue,
        textIsString: typeof textValue === "string",
        textLen: typeof textValue === "string" ? textValue.length : null,
        textPrefix: typeof textValue === "string" ? textValue.slice(0, 180) : null,
        envelopeSuccess: envelopeParse.success,
        envelopeIssues: envelopeParse.success
          ? []
          : envelopeParse.error.issues.map((i) => ({
              path: i.path,
              code: i.code,
              message: i.message,
            })),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  // #region agent log
  fetch("http://127.0.0.1:7347/ingest/2ac28a71-ef8c-4fc1-907c-5f99302f68ea", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "f31864",
    },
    body: JSON.stringify({
      sessionId: "f31864",
      runId: "pre-fix",
      hypothesisId: "B-C-D",
      location: "server/src/routes/index.ts:json-parse-text",
      message: "Parsed inner JSON shape and truncation",
      data: {
        jsonParseOk: parseError === null && parsedText !== null,
        parseError,
        parsedKeys,
        hasProjectBlueprintWrapper:
          parsedKeys.includes("ProjectBlueprint") || parsedKeys.includes("projectBlueprint"),
        hasProjectName: parsedKeys.includes("projectName"),
        outputSchemaTopKeys:
          jsonSchema && typeof jsonSchema === "object" && jsonSchema !== null
            ? Object.keys(jsonSchema as object)
            : [],
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const parsedObj =
    parsedText && typeof parsedText === "object" && parsedText !== null
      ? (parsedText as Record<string, unknown>)
      : null;
  const arrayLen = (key: string) =>
    Array.isArray(parsedObj?.[key]) ? (parsedObj[key] as unknown[]).length : null;
  // #region agent log
  fetch("http://127.0.0.1:7347/ingest/2ac28a71-ef8c-4fc1-907c-5f99302f68ea", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "f31864",
    },
    body: JSON.stringify({
      sessionId: "f31864",
      runId: "post-fix",
      hypothesisId: "F",
      location: "server/src/routes/index.ts:json-completeness",
      message: "JSON completeness vs inspect truncation",
      data: {
        stopReason: response.stop_reason,
        outputTokens: response.usage.output_tokens,
        maxTokensRequested: 16000,
        textLen: typeof textValue === "string" ? textValue.length : null,
        inspectWouldTruncate:
          typeof textValue === "string" ? textValue.length > 10000 : null,
        inspectHiddenChars:
          typeof textValue === "string" ? Math.max(0, textValue.length - 10000) : null,
        jsonEndsWithBrace:
          typeof textValue === "string" ? textValue.trimEnd().endsWith("}") : null,
        textSuffix: typeof textValue === "string" ? textValue.slice(-80) : null,
        epicCount: arrayLen("epics"),
        storyCount: arrayLen("userStories"),
        gherkinCount: arrayLen("gherkinScenarios"),
        taskCount: arrayLen("tasks"),
        priorityCount: arrayLen("priorities"),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  console.log("Raw response summary ---", {
    stop_reason: response.stop_reason,
    output_tokens: response.usage.output_tokens,
    textLen: typeof textValue === "string" ? textValue.length : null,
    textSuffix: typeof textValue === "string" ? textValue.slice(-120) : null,
    parsedCounts: {
      epics: arrayLen("epics"),
      userStories: arrayLen("userStories"),
      gherkinScenarios: arrayLen("gherkinScenarios"),
      tasks: arrayLen("tasks"),
      priorities: arrayLen("priorities"),
    },
  });

  if (typeof textValue !== "string") {
    return res.status(500).json({
      error: "Server or third party dependencies could not process your request.",
    });
  }

  if (parseError || parsedText === null) {
    return res.status(502).json({
      error:
        response.stop_reason === "max_tokens"
          ? "Model output was truncated before valid JSON completed. Retry with a smaller plan or higher max_tokens."
          : "Model output was not valid JSON.",
    });
  }

  const unwrapped = unwrapProjectBlueprint(parsedText);
  const blueprintParse = ProjectBlueprintSchema.safeParse(unwrapped);

  // #region agent log
  fetch("http://127.0.0.1:7347/ingest/2ac28a71-ef8c-4fc1-907c-5f99302f68ea", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "f31864",
    },
    body: JSON.stringify({
      sessionId: "f31864",
      runId: "post-fix",
      hypothesisId: "A-C-D",
      location: "server/src/routes/index.ts:blueprint-parse",
      message: "ProjectBlueprint validation after unwrap",
      data: {
        stopReason: response.stop_reason,
        blueprintSuccess: blueprintParse.success,
        epicCount: blueprintParse.success ? blueprintParse.data.epics.length : null,
        issueCount: blueprintParse.success ? 0 : blueprintParse.error.issues.length,
        firstIssues: blueprintParse.success
          ? []
          : blueprintParse.error.issues.slice(0, 5).map((i) => ({
              path: i.path,
              message: i.message,
            })),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (!blueprintParse.success) {
    return res.status(502).json({
      error: "Model JSON did not match ProjectBlueprint schema.",
      issues: blueprintParse.error.issues,
    });
  }

  return res.status(200).json({ projectBlueprint: blueprintParse.data });
  // const projectData = JSON.parse(validatedData.content.text);
  
  // return res.status(200).json(validatedData);
  
  // ! TODO Handle error case
  return res.status(500).json({ error: "Server or third party dependencies could not process your request." });
  
  // if (
  //   isEmpty(data) ||
  //   !data.content ||
  //   !Array.isArray(data.content) ||
  //   data.content.length === 0
  // ) {
  //   return res.status(400).json({ error: "Invalid response from AI model" });
});
