import { config, OAuthProviderName, oauthEnabled } from "../config";
import { HttpError } from "../lib/http";

/** Normalised profile returned by every provider. */
export interface OAuthProfile {
  provider: OAuthProviderName;
  /** Stable subject id at the provider (Google `sub`, GitHub numeric id). */
  providerAccountId: string;
  /** Only set when the provider vouches for the address. */
  verifiedEmail: string | null;
  name: string;
  avatarUrl: string | null;
}

interface ProviderAdapter {
  authorizeUrl(state: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthProfile>;
}

export const PROVIDERS: readonly OAuthProviderName[] = ["google", "github"];

export function isProviderName(value: string): value is OAuthProviderName {
  return (PROVIDERS as readonly string[]).includes(value);
}

export function redirectUriFor(provider: OAuthProviderName): string {
  return `${config.apiPublicUrl}/api/auth/${provider}/callback`;
}

async function postForm(url: string, body: Record<string, string>, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", ...headers },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new HttpError(502, `Token exchange failed (${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

async function getJson<T>(url: string, accessToken: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json", ...headers },
  });
  if (!res.ok) throw new HttpError(502, `Profile request failed (${res.status})`);
  return (await res.json()) as T;
}

// ---- Google (OpenID Connect) -------------------------------------------------

const google: ProviderAdapter = {
  authorizeUrl(state, redirectUri) {
    const params = new URLSearchParams({
      client_id: config.oauth.google.clientId!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  async exchangeCode(code, redirectUri) {
    const token = await postForm("https://oauth2.googleapis.com/token", {
      code,
      client_id: config.oauth.google.clientId!,
      client_secret: config.oauth.google.clientSecret!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    const accessToken = token.access_token;
    if (typeof accessToken !== "string") throw new HttpError(502, "Google did not return an access token");

    const info = await getJson<{
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    }>("https://openidconnect.googleapis.com/v1/userinfo", accessToken);

    return {
      provider: "google",
      providerAccountId: info.sub,
      verifiedEmail: info.email && info.email_verified ? info.email : null,
      name: info.name?.trim() || info.email?.split("@")[0] || "Google user",
      avatarUrl: info.picture ?? null,
    };
  },
};

// ---- GitHub -------------------------------------------------------------------

const GITHUB_HEADERS = {
  "User-Agent": "StoryFlow",
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

const github: ProviderAdapter = {
  authorizeUrl(state, redirectUri) {
    const params = new URLSearchParams({
      client_id: config.oauth.github.clientId!,
      redirect_uri: redirectUri,
      scope: "read:user user:email",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  },

  async exchangeCode(code, redirectUri) {
    // GitHub often returns HTTP 200 with `{ error, error_description }` when
    // the client secret, code, or redirect_uri is wrong. Treat that as failure.
    const token = await postForm(
      "https://github.com/login/oauth/access_token",
      {
        client_id: config.oauth.github.clientId!,
        client_secret: config.oauth.github.clientSecret!,
        code,
        redirect_uri: redirectUri,
      },
      { "User-Agent": "StoryFlow" },
    );
    if (typeof token.error === "string") {
      const detail =
        typeof token.error_description === "string" ? `: ${token.error_description}` : "";
      throw new HttpError(502, `GitHub token exchange failed (${token.error}${detail})`);
    }
    const accessToken = token.access_token;
    if (typeof accessToken !== "string") throw new HttpError(502, "GitHub did not return an access token");

    const [user, emails] = await Promise.all([
      getJson<{ id: number; login: string; name: string | null; avatar_url: string | null }>(
        "https://api.github.com/user",
        accessToken,
        GITHUB_HEADERS,
      ),
      getJson<{ email: string; primary: boolean; verified: boolean }[]>(
        "https://api.github.com/user/emails",
        accessToken,
        GITHUB_HEADERS,
      ).catch(() => [] as { email: string; primary: boolean; verified: boolean }[]),
    ]);

    const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);

    return {
      provider: "github",
      providerAccountId: String(user.id),
      verifiedEmail: primary?.email ?? null,
      name: user.name?.trim() || user.login,
      avatarUrl: user.avatar_url,
    };
  },
};

const adapters: Record<OAuthProviderName, ProviderAdapter> = { google, github };

export function getProvider(name: OAuthProviderName): ProviderAdapter {
  if (!oauthEnabled(name)) {
    throw new HttpError(
      503,
      `${name} sign-in is not configured. Set ${name.toUpperCase()}_CLIENT_ID and ${name.toUpperCase()}_CLIENT_SECRET.`,
    );
  }
  return adapters[name];
}
