import dotenv from "dotenv";
import path from "path";

// Load server/.env before anything reads process.env. dotenv never overrides
// variables that are already set, so this is safe to call from several modules.
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const trimSlash = (url: string) => url.replace(/\/+$/, "");
const envTrim = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value || undefined;
};
const port = Number(process.env.PORT ?? 3001);

export type OAuthProviderName = "google" | "github";

export interface OAuthClientConfig {
  clientId: string | undefined;
  clientSecret: string | undefined;
}

export const config = {
  isProd: process.env.NODE_ENV === "production",
  port,

  /** Where the browser app lives; OAuth callbacks redirect here. */
  clientUrl: trimSlash(process.env.CLIENT_URL ?? "http://localhost:3000"),

  /** Public origin of this API, used to build OAuth redirect URIs. */
  // Local Vite: set API_PUBLIC_URL to the client origin so Google returns
  // through the /api proxy and the session cookie is same-origin.
  apiPublicUrl: trimSlash(process.env.API_PUBLIC_URL ?? `http://localhost:${port}`),

  session: {
    cookieName: process.env.SESSION_COOKIE_NAME ?? "sf_session",
    ttlMs: Number(process.env.SESSION_TTL_DAYS ?? 30) * 24 * 60 * 60 * 1000,
  },

  oauth: {
    google: {
      clientId: envTrim("GOOGLE_CLIENT_ID"),
      clientSecret: envTrim("GOOGLE_CLIENT_SECRET"),
    },
    github: {
      clientId: envTrim("GITHUB_CLIENT_ID"),
      clientSecret: envTrim("GITHUB_CLIENT_SECRET"),
    },
  } satisfies Record<OAuthProviderName, OAuthClientConfig>,
} as const;

export function oauthEnabled(provider: OAuthProviderName): boolean {
  const { clientId, clientSecret } = config.oauth[provider];
  return Boolean(clientId && clientSecret);
}
