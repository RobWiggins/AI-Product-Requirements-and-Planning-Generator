import { createHash, randomBytes } from "crypto";
import { Response } from "express";
import { config, OAuthProviderName } from "../config";
import { prisma } from "../db/prisma";

/** The user as exposed to the API and the client. Never includes tokens. */
export interface SessionUser {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  isGuest: boolean;
  /** Providers currently linked to this user. */
  providers: OAuthProviderName[];
}

const TOUCH_INTERVAL_MS = 60 * 60 * 1000; // update last_seen_at at most hourly

const generateToken = () => randomBytes(32).toString("base64url");
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function toSessionUser(user: {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  isGuest: boolean;
  identities: { provider: string }[];
}): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    isGuest: user.isGuest,
    providers: user.identities.map((i) => i.provider as OAuthProviderName),
  };
}

export async function loadSessionUser(userId: string): Promise<SessionUser> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { identities: { select: { provider: true } } },
  });
  return toSessionUser(user);
}

/** Creates a session row and returns the raw token to place in the cookie. */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + config.session.ttlMs);
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  return { token, expiresAt };
}

/** Resolves a cookie token to its user, or null if missing / expired. */
export async function findSessionUser(token: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { identities: { select: { provider: true } } } } },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  }

  return toSessionUser(session.user);
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

// ---- Cookies -----------------------------------------------------------------

const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: config.isProd,
  path: "/",
};

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(config.session.cookieName, token, { ...baseCookie, expires: expiresAt });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.session.cookieName, baseCookie);
}
