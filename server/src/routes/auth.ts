import { randomBytes } from "crypto";
import { Router } from "express";
import { config, oauthEnabled } from "../config";
import { asyncHandler, HttpError } from "../lib/http";
import { requireAuth } from "../auth/middleware";
import { getProvider, isProviderName, PROVIDERS, redirectUriFor } from "../auth/oauth";
import {
  clearSessionCookie,
  createSession,
  revokeSession,
  setSessionCookie,
} from "../auth/session";
import { createGuestUser, resolveUserForProfile } from "../auth/users";

/**
 * /api/auth
 *
 *   GET  /providers            which sign-in options are available
 *   GET  /me                   current user (401 when signed out)
 *   POST /guest                create a guest user + session
 *   POST /logout               revoke the session
 *   GET  /:provider            start the OAuth dance (browser navigation)
 *   GET  /:provider/callback   finish it; redirects back to the client
 */
export const authRouter = Router();

const STATE_COOKIE = `${config.session.cookieName}_oauth`;
const stateCookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: config.isProd,
  path: "/api/auth",
  maxAge: 10 * 60 * 1000,
};

const clientRedirect = (status: "ok" | "cancelled" | "error", reason?: string) => {
  const params = new URLSearchParams({ auth: status });
  if (reason) params.set("reason", reason);
  return `${config.clientUrl}/?${params}`;
};

authRouter.get("/providers", (_req, res) => {
  res.json({
    guest: true,
    ...Object.fromEntries(PROVIDERS.map((p) => [p, oauthEnabled(p)])),
  });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.post(
  "/guest",
  asyncHandler(async (req, res) => {
    // Idempotent: an existing session (guest or not) is simply returned.
    if (req.user) {
      res.json({ user: req.user });
      return;
    }
    const user = await createGuestUser();
    const { token, expiresAt } = await createSession(user.id);
    setSessionCookie(res, token, expiresAt);
    res.status(201).json({ user });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token: unknown = req.cookies?.[config.session.cookieName];
    if (typeof token === "string") await revokeSession(token);
    clearSessionCookie(res);
    res.status(204).end();
  }),
);

authRouter.get("/:provider", (req, res) => {
  const { provider } = req.params;
  if (!isProviderName(provider)) throw new HttpError(404, "Unknown provider");
  const adapter = getProvider(provider);

  const state = randomBytes(16).toString("base64url");
  res.cookie(STATE_COOKIE, state, stateCookieOpts);
  res.redirect(adapter.authorizeUrl(state, redirectUriFor(provider)));
});

authRouter.get(
  "/:provider/callback",
  asyncHandler(async (req, res) => {
    const { provider } = req.params;
    if (!isProviderName(provider)) throw new HttpError(404, "Unknown provider");

    const expectedState: unknown = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, stateCookieOpts);

    if (typeof req.query.error === "string") {
      res.redirect(clientRedirect(req.query.error === "access_denied" ? "cancelled" : "error", req.query.error));
      return;
    }

    const { code, state } = req.query;
    if (typeof code !== "string" || typeof state !== "string" || state !== expectedState) {
      res.redirect(clientRedirect("error", "invalid_state"));
      return;
    }

    try {
      const profile = await getProvider(provider).exchangeCode(code, redirectUriFor(provider));
      const user = await resolveUserForProfile(profile, req.user);
      const { token, expiresAt } = await createSession(user.id);
      setSessionCookie(res, token, expiresAt);
      res.redirect(clientRedirect("ok"));
    } catch (err) {
      console.error(`[auth] ${provider} callback failed:`, err);
      res.redirect(clientRedirect("error", "exchange_failed"));
    }
  }),
);
