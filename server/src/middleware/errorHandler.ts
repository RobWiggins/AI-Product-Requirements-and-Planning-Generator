import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  status?: number;
  /** Optional structured detail (e.g. Zod issues) safe to return to the client. */
  issues?: unknown;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Errors thrown as HttpError carry a status and a client-safe message.
  // Anything else is unexpected: log it and hide the details.
  const expected = typeof err.status === "number";
  if (!expected) console.error(err);

  const status = expected ? err.status! : 500;
  const message = expected ? err.message || "Request failed" : "Internal Server Error";
  res.status(status).json(err.issues ? { error: message, issues: err.issues } : { error: message });
}
