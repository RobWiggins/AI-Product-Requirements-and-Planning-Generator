import { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { clearSessionCookie, findSessionUser, SessionUser } from "./session";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by attachUser when a valid session cookie is present. */
      user?: SessionUser;
    }
  }
}

/** Reads the session cookie and, if valid, sets req.user. Never rejects. */
export async function attachUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token: unknown = req.cookies?.[config.session.cookieName];
  if (typeof token !== "string" || token.length === 0) return next();

  try {
    const user = await findSessionUser(token);
    if (user) req.user = user;
    else clearSessionCookie(res);
    next();
  } catch (err) {
    next(err);
  }
}

/** 401 unless attachUser found a user. Guests count as authenticated. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}
