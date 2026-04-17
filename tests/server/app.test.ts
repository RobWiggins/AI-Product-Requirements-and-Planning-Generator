import request from "supertest";
import { app } from "@server/app";

jest.mock("@server/db", () => ({
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [] }),
  },
}));

describe("GET /api/health", () => {
  it("returns 200 with ok status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok" });
  });
});

describe("GET /api/items", () => {
  it("returns an array", async () => {
    const res = await request(app).get("/api/items");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
