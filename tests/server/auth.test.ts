import request from "supertest";
import { app } from "@server/app";
import { prisma } from "@server/db/prisma";

/**
 * Exercises the guest sign-in flow and user-scoped project persistence against
 * the real storyflow database. Users created here are removed in afterAll.
 */

const createdUserIds: string[] = [];

/** Signs in as a fresh guest and returns an agent that carries the session cookie. */
async function guestAgent() {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/guest");
  expect(res.status).toBe(201);
  expect(res.headers["set-cookie"]?.[0]).toMatch(/sf_session=.*HttpOnly/);
  createdUserIds.push(res.body.user.id);
  return { agent, user: res.body.user as { id: string; isGuest: boolean; name: string } };
}

const blueprint = {
  projectName: "PupMatch",
  description: "Dog playdates",
  version: "1.0.0",
  productRequirementsDocument: {
    overview: "Find playdates",
    objectives: ["Match dogs"],
    targetAudience: "Dog owners",
    successMetrics: ["Weekly matches"],
    scope: "Matching",
    outOfScope: ["Payments"],
  },
  epics: [
    { epicId: "E-001", title: "Profiles", description: "", priority: "High" },
    { epicId: "E-002", title: "Matching", description: "", priority: "Medium" },
  ],
  userStories: [
    {
      storyId: "US-001",
      epicId: "E-001",
      title: "Create profile",
      asA: "owner",
      iWant: "a profile",
      soThat: "I can be found",
      priority: "High",
      acceptanceCriteria: ["Has photo"],
    },
  ],
  gherkinScenarios: [
    { scenarioId: "SC-001", storyId: "US-001", feature: "Profiles", scenario: "Create", given: "a", when: "b", then: "c" },
  ],
  tasks: [
    { taskId: "T-001", storyId: "US-001", title: "Form", description: "", estimatedHours: 3, priority: "High", dependencies: [] },
    { taskId: "T-002", storyId: "US-001", title: "API", description: "", estimatedHours: 5, priority: "Medium", dependencies: ["T-001"], completed: true },
  ],
  priorities: [{ priorityId: "P-001", level: "High", itemId: "E-001", rationale: "First" }],
};

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

describe("auth", () => {
  it("lists providers; guest is always available", async () => {
    const res = await request(app).get("/api/auth/providers");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ guest: true });
    expect(typeof res.body.google).toBe("boolean");
    expect(typeof res.body.github).toBe("boolean");
  });

  it("returns 401 from /me when signed out", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("creates a guest user with a UUID and a session cookie", async () => {
    const { agent, user } = await guestAgent();
    expect(user).toMatchObject({ isGuest: true, name: "Guest", providers: [] });
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe(user.id);
  });

  it("is idempotent: a second guest call returns the same user", async () => {
    const { agent, user } = await guestAgent();
    const again = await agent.post("/api/auth/guest");
    expect(again.status).toBe(200);
    expect(again.body.user.id).toBe(user.id);
  });

  it("logout revokes the session", async () => {
    const { agent } = await guestAgent();
    expect((await agent.post("/api/auth/logout")).status).toBe(204);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
    expect(
      await prisma.session.count({ where: { userId: createdUserIds[createdUserIds.length - 1] } })
    ).toBe(0);
  });

  it("rejects an unknown or unconfigured provider cleanly", async () => {
    expect((await request(app).get("/api/auth/twitter")).status).toBe(404);
    const res = await request(app).get("/api/auth/google");
    // 302 if GOOGLE_* is configured in server/.env, 503 otherwise.
    expect([302, 503]).toContain(res.status);
  });

  it("protects generation behind a session", async () => {
    const res = await request(app).get("/api/search?description=anything");
    expect(res.status).toBe(401);
  });
});

describe("projects (user-owned)", () => {
  it("saves, lists, loads, replaces and deletes a project for its owner", async () => {
    const { agent, user } = await guestAgent();

    const created = await agent.post("/api/projects").send(blueprint);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      projectName: "PupMatch",
      epics: [{ epicId: "E-001" }, { epicId: "E-002" }],
      tasks: [
        { taskId: "T-001", completed: false, estimatedHours: 3 },
        { taskId: "T-002", completed: true, dependencies: ["T-001"] },
      ],
      productRequirementsDocument: { objectives: ["Match dogs"] },
    });
    const id: string = created.body.id;
    expect(await prisma.project.findUnique({ where: { id } })).toMatchObject({ userId: user.id });

    const list = await agent.get("/api/projects");
    expect(list.body).toEqual([
      expect.objectContaining({ id, epicCount: 2, storyCount: 1, taskCount: 2, completedTaskCount: 1 }),
    ]);

    // Reorder epics + drop the story: PUT rebuilds children and keeps order.
    const edited = { ...blueprint, epics: [blueprint.epics[1], blueprint.epics[0]], userStories: [], gherkinScenarios: [], tasks: [] };
    const replaced = await agent.put(`/api/projects/${id}`).send(edited);
    expect(replaced.status).toBe(200);
    expect(replaced.body.epics.map((e: { epicId: string }) => e.epicId)).toEqual(["E-002", "E-001"]);
    expect(replaced.body.tasks).toEqual([]);

    const loaded = await agent.get(`/api/projects/${id}`);
    expect(loaded.status).toBe(200);
    expect(loaded.body.epics.map((e: { epicId: string }) => e.epicId)).toEqual(["E-002", "E-001"]);

    expect((await agent.delete(`/api/projects/${id}`)).status).toBe(204);
    expect((await agent.get(`/api/projects/${id}`)).status).toBe(404);
  });

  it("never exposes another user's project", async () => {
    const owner = await guestAgent();
    const intruder = await guestAgent();

    const created = await owner.agent.post("/api/projects").send(blueprint);
    const id: string = created.body.id;

    expect((await intruder.agent.get(`/api/projects/${id}`)).status).toBe(404);
    expect((await intruder.agent.put(`/api/projects/${id}`).send(blueprint)).status).toBe(404);
    expect((await intruder.agent.delete(`/api/projects/${id}`)).status).toBe(404);
    expect((await intruder.agent.get("/api/projects")).body).toEqual([]);
    expect((await owner.agent.get(`/api/projects/${id}`)).status).toBe(200);
  });

  it("validates the payload and reports dangling references", async () => {
    const { agent } = await guestAgent();

    expect((await agent.post("/api/projects").send({ projectName: "x" })).status).toBe(400);

    const dangling = { ...blueprint, userStories: [{ ...blueprint.userStories[0], epicId: "E-404" }] };
    const res = await agent.post("/api/projects").send(dangling);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not exist/);
  });

  it("requires a session", async () => {
    expect((await request(app).get("/api/projects")).status).toBe(401);
  });
});
