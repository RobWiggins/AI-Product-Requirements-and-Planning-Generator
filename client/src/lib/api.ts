import type { ProjectBlueprint } from "./ai";

/**
 * Thin fetch wrapper for the StoryFlow API.
 *
 * Paths are relative (`/api/...`): in development Vite proxies them to the
 * Express server; in production the client is served same-origin with the API.
 * The session is an httpOnly cookie, so every call sends credentials.
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

export const generateApi = {
  blueprint: (description: string) =>
    api<{ projectBlueprint: ProjectBlueprint }>(`/search?description=${encodeURIComponent(description)}`),
};
