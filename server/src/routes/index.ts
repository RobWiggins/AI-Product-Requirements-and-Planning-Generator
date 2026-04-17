import { Router, Request, Response } from "express";
import { pool } from "../db";

export const router = Router();

router.get("/health", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
});

router.get("/items", async (_req: Request, res: Response) => {
  const { rows } = await pool.query("SELECT * FROM items ORDER BY created_at DESC");
  res.json(rows);
});
