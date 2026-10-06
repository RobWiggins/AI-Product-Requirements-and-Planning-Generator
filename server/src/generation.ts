import { randomUUID } from "crypto";
import Anthropic, { APIConnectionError } from "@anthropic-ai/sdk";
import { z } from "zod";
import { ProjectBlueprintSchema, type ProjectBlueprint } from "./schemas/claudeResponse";

const JOB_TTL_MS = 15 * 60 * 1000;
const ANTHROPIC_ATTEMPTS = 3;

export type GenerationJob = {
  id: string;
  userId: string;
  createdAt: number;
  status: "pending" | "complete" | "error";
  projectBlueprint?: ProjectBlueprint;
  error?: string;
  issues?: unknown;
};

const jobs = new Map<string, GenerationJob>();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  authToken: process.env.CLAUDE_CODE_OAUTH_TOKEN,
  timeout: 8 * 60 * 1000,
  maxRetries: 0,
});

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

function pruneJobs(now = Date.now()): void {
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) jobs.delete(id);
  }
}

export function createGenerationJob(userId: string): GenerationJob {
  pruneJobs();
  const job: GenerationJob = {
    id: randomUUID(),
    userId,
    createdAt: Date.now(),
    status: "pending",
  };
  jobs.set(job.id, job);
  return job;
}

export function getGenerationJob(id: string, userId: string): GenerationJob | null {
  pruneJobs();
  const job = jobs.get(id);
  if (!job || job.userId !== userId) return null;
  return job;
}

export function publicJob(job: GenerationJob): {
  status: GenerationJob["status"];
  projectBlueprint?: ProjectBlueprint;
  error?: string;
  issues?: unknown;
} {
  if (job.status === "complete") {
    return { status: job.status, projectBlueprint: job.projectBlueprint };
  }
  if (job.status === "error") {
    return { status: job.status, error: job.error, issues: job.issues };
  }
  return { status: job.status };
}

export async function runGeneration(job: GenerationJob, description: string): Promise<void> {
  const jsonSchema = z.toJSONSchema(ProjectBlueprintSchema);

  for (let attempt = 1; attempt <= ANTHROPIC_ATTEMPTS; attempt++) {
    try {
      const response = await client.messages
        .stream({
          model: "claude-sonnet-4-6",
          max_tokens: 16000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: description }],
          output_config: {
            format: {
              type: "json_schema",
              schema: jsonSchema,
            },
          },
        })
        .finalMessage();

      if (!response || Object.keys(response).length === 0) {
        job.status = "error";
        job.error = "Invalid response from AI model";
        return;
      }

      const firstBlock = response.content[0];
      const textValue = firstBlock && "text" in firstBlock ? firstBlock.text : undefined;
      if (typeof textValue !== "string") {
        job.status = "error";
        job.error = "Server or third party dependencies could not process your request.";
        return;
      }

      let parsedText: unknown = null;
      try {
        parsedText = JSON.parse(textValue);
      } catch {
        job.status = "error";
        job.error =
          response.stop_reason === "max_tokens"
            ? "Model output was truncated before valid JSON completed. Retry with a smaller plan or higher max_tokens."
            : "Model output was not valid JSON.";
        return;
      }

      const blueprintParse = ProjectBlueprintSchema.safeParse(unwrapProjectBlueprint(parsedText));
      if (!blueprintParse.success) {
        job.status = "error";
        job.error = "Model JSON did not match ProjectBlueprint schema.";
        job.issues = blueprintParse.error.issues;
        return;
      }

      job.projectBlueprint = blueprintParse.data;
      job.status = "complete";
      return;
    } catch (err) {
      console.error(err);
      const retryable = err instanceof APIConnectionError && attempt < ANTHROPIC_ATTEMPTS;
      if (retryable) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      job.status = "error";
      job.error =
        err instanceof APIConnectionError
          ? "Could not reach Anthropic. Check your network and try again."
          : "Internal Server Error";
      return;
    }
  }
}
