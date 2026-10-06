import type { ProjectBlueprint } from "./ai";

/**
 * Thin fetch wrapper for the StoryFlow API.
 *
 * Paths are relative (`/api/...`). In development Vite proxies them to the
 * Express server. In production, client/vercel.json proxies them to Heroku.
 * Either way the browser stays on the client origin, so the httpOnly session
 * cookie is sent with every call.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  /** JSON-encoded into the body with the right content-type. */
  json?: unknown;
}

export async function api<T>(path: string, { json, headers, ...init }: RequestOptions = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: {
      Accept: "application/json",
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (body ?? {}) as { error?: string; issues?: unknown };
    throw new ApiError(res.status, err.error ?? res.statusText, err.issues);
  }
  return body as T;
}

// ---- Shapes shared with the server -------------------------------------------------

export type OAuthProviderName = "google" | "github";

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  isGuest: boolean;
  providers: OAuthProviderName[];
}

export interface AuthProviders {
  guest: boolean;
  google: boolean;
  github: boolean;
}

/** A saved task also carries its completion state. */
export type StoredTask = ProjectBlueprint["tasks"][number] & { completed?: boolean };

/** What we send when saving: the blueprint plus persisted UI state. */
export type StoredBlueprint = Omit<ProjectBlueprint, "tasks"> & { tasks: StoredTask[] };

export type SavedProject = StoredBlueprint & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export interface ProjectSummary {
  id: string;
  projectName: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  epicCount: number;
  storyCount: number;
  taskCount: number;
  completedTaskCount: number;
}

// ---- Endpoints ------------------------------------------------------------------

export const authApi = {
  providers: () => api<AuthProviders>("/auth/providers"),
  me: () => api<{ user: AuthUser }>("/auth/me"),
  guest: () => api<{ user: AuthUser }>("/auth/guest", { method: "POST" }),
  logout: () => api<void>("/auth/logout", { method: "POST" }),
  /** OAuth is a full-page redirect; the server sends us back with `?auth=`. */
  startOAuth: (provider: OAuthProviderName) => {
    window.location.assign(`/api/auth/${provider}`);
  },
};

export const projectsApi = {
  list: () => api<ProjectSummary[]>("/projects"),
  get: (id: string) => api<SavedProject>(`/projects/${id}`),
  create: (blueprint: StoredBlueprint) => api<SavedProject>("/projects", { method: "POST", json: blueprint }),
  replace: (id: string, blueprint: StoredBlueprint) =>
    api<SavedProject>(`/projects/${id}`, { method: "PUT", json: blueprint }),
  remove: (id: string) => api<void>(`/projects/${id}`, { method: "DELETE" }),
};

async function readSseGeneration(res: Response): Promise<{ projectBlueprint: ProjectBlueprint }> {
  if (!res.body) throw new ApiError(502, "Generation stream was empty.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const acc: {
    result: { projectBlueprint: ProjectBlueprint } | null;
    errorMessage: string | null;
    issues: unknown;
  } = { result: null, errorMessage: null, issues: undefined };

  const consumeBlock = (block: string) => {
    let event = "message";
    const dataLines: string[] = [];
    for (const rawLine of block.split("\n")) {
      const line = rawLine.replace(/\r$/, "");
      if (!line || line.startsWith(":")) continue;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }
    if (dataLines.length === 0) return;

    let payload: unknown = dataLines.join("\n");
    try {
      payload = JSON.parse(dataLines.join("\n"));
    } catch {
      // keep the raw string
    }

    if (event === "result") {
      acc.result = payload as { projectBlueprint: ProjectBlueprint };
    } else if (event === "error") {
      const err = (payload ?? {}) as { error?: string; issues?: unknown };
      acc.errorMessage = err.error ?? "Generation failed.";
      acc.issues = err.issues;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) consumeBlock(part);
  }
  if (buffer.trim()) consumeBlock(buffer);

  if (acc.errorMessage) throw new ApiError(502, acc.errorMessage, acc.issues);
  if (!acc.result?.projectBlueprint) throw new ApiError(502, "Generation ended without a result.");
  return acc.result;
}

export const generateApi = {
  blueprint: async (description: string) => {
    const res = await fetch(`/api/search?description=${encodeURIComponent(description)}`, {
      credentials: "include",
      headers: { Accept: "text/event-stream, application/json" },
    });

    if (!res.ok) {
      const body: unknown = await res.json().catch(() => null);
      const err = (body ?? {}) as { error?: string; issues?: unknown };
      throw new ApiError(res.status, err.error ?? res.statusText, err.issues);
    }

    const contentType = res.headers?.get?.("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      return readSseGeneration(res);
    }

    const body: unknown = await res.json().catch(() => null);
    const parsed = body as { projectBlueprint?: ProjectBlueprint; error?: string; issues?: unknown };
    if (!parsed?.projectBlueprint) {
      throw new ApiError(502, parsed?.error ?? "Generation ended without a result.", parsed?.issues);
    }
    return { projectBlueprint: parsed.projectBlueprint };
  },
};
