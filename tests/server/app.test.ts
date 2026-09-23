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
