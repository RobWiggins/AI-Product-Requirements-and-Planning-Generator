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

const POLL_MS = 1500;
const GENERATION_TIMEOUT_MS = 3 * 60 * 1000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const generateApi = {
  blueprint: async (description: string) => {
    const { jobId } = await api<{ jobId: string }>("/search", {
      method: "POST",
      json: { description },
    });

    const deadline = Date.now() + GENERATION_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const job = await api<{
        status: "pending" | "complete" | "error";
        projectBlueprint?: ProjectBlueprint;
        error?: string;
        issues?: unknown;
      }>(`/search/${jobId}`);

      if (job.status === "complete" && job.projectBlueprint) {
        return { projectBlueprint: job.projectBlueprint };
      }
      if (job.status === "error") {
        throw new ApiError(502, job.error ?? "Generation failed.", job.issues);
      }
      await wait(POLL_MS);
    }

    throw new ApiError(504, "Generation timed out. Please try again.");
  },
};
