import { prisma } from "@server/db/prisma";

/**
 * Hits the real storyflow database through the Prisma client.
 * Rows are scoped to a unique email and removed in afterAll.
 */
const email = `prisma-test-${Date.now()}@example.com`;

let userId: string;
let projectId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email,
      name: "Prisma Test",
      projects: {
        create: {
          projectName: "Prisma Test Project",
          description: "Integration test",
          productRequirementsDocument: {
            create: {
              overview: "Test overview",
              targetAudience: "Engineers",
              scope: "The test itself",
              objectives: ["Prove Prisma writes and reads"],
              successMetrics: ["Rows round-trip"],
              outOfScope: ["Production data"],
            },
          },
          epics: {
            create: { epicId: "E-001", title: "Profiles", priority: "High" },
          },
          priorities: {
            create: {
              priorityId: "P-001",
              level: "High",
              itemId: "US-001",
              rationale: "Needed first",
            },
          },
        },
      },
    },
    include: { projects: true },
  });

  userId = user.id;
  projectId = user.projects[0].id;

  await prisma.userStory.create({
    data: {
      projectId,
      storyId: "US-001",
      epicId: "E-001",
      title: "Create a profile",
      asA: "user",
      iWant: "to create a profile",
      soThat: "I can be found",
      priority: "High",
      acceptanceCriteria: ["Has a name"],
      tasks: {
        create: {
          taskId: "T-001",
          title: "Build the form",
          priority: "Medium",
          estimatedHours: 3,
          dependencies: ["T-000"],
        },
      },
      gherkinScenarios: {
        create: {
          scenarioId: "GS-001",
          feature: "Profiles",
          scenario: "Create",
          given: "I am signed in",
          when: "I submit the form",
          then: "a profile is saved",
        },
      },
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe("Prisma models against the database", () => {
  it("reads a project with its PRD, epics, stories, tasks, and scenarios", async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: {
        user: true,
        productRequirementsDocument: true,
        epics: { include: { userStories: { include: { tasks: true, gherkinScenarios: true } } } },
        priorities: true,
      },
    });

    expect(project.user.email).toBe(email);
    expect(project.projectName).toBe("Prisma Test Project");
    expect(project.productRequirementsDocument?.objectives).toEqual([
      "Prove Prisma writes and reads",
    ]);
    expect(project.epics).toHaveLength(1);
    expect(project.epics[0].userStories[0]).toMatchObject({
      storyId: "US-001",
      epicId: "E-001",
      acceptanceCriteria: ["Has a name"],
    });
    expect(project.epics[0].userStories[0].tasks[0]).toMatchObject({
      taskId: "T-001",
      dependencies: ["T-000"],
      completed: false,
    });
    expect(project.epics[0].userStories[0].tasks[0].estimatedHours.toString()).toBe("3");
    expect(project.epics[0].userStories[0].gherkinScenarios[0].scenarioId).toBe("GS-001");
    expect(project.priorities[0]).toMatchObject({ priorityId: "P-001", itemId: "US-001" });
  });

  it("filters collections the way the API does", async () => {
    const projects = await prisma.project.findMany({ where: { userId } });
    const stories = await prisma.userStory.findMany({
      where: { projectId, epicId: "E-001" },
    });
    const tasks = await prisma.task.findMany({
      where: { projectId, storyId: "US-001" },
    });

    expect(projects.map((project) => project.id)).toEqual([projectId]);
    expect(stories.map((story) => story.storyId)).toEqual(["US-001"]);
    expect(tasks.map((task) => task.taskId)).toEqual(["T-001"]);
  });

  it("updates a row and bumps updatedAt", async () => {
    const before = await prisma.task.findUniqueOrThrow({
      where: { projectId_taskId: { projectId, taskId: "T-001" } },
    });

    const after = await prisma.task.update({
      where: { projectId_taskId: { projectId, taskId: "T-001" } },
      data: { completed: true },
    });

    expect(after.completed).toBe(true);
    expect(after.updatedAt.getTime()).toBeGreaterThanOrEqual(before.updatedAt.getTime());
  });

  it("rejects a story whose epic does not exist", async () => {
    await expect(
      prisma.userStory.create({
        data: {
          projectId,
          storyId: "US-999",
          epicId: "E-MISSING",
          title: "Orphan",
          priority: "Low",
        },
      })
    ).rejects.toMatchObject({ code: "P2003" });
  });

  it("cascades a user delete down to the project and its children", async () => {
    await prisma.user.delete({ where: { id: userId } });

    expect(await prisma.project.count({ where: { id: projectId } })).toBe(0);
    expect(await prisma.task.count({ where: { projectId } })).toBe(0);
    expect(await prisma.userStory.count({ where: { projectId } })).toBe(0);
  });
});
