import { z } from "zod";
import { prisma, Prisma } from "../db/prisma";
import { HttpError } from "../lib/http";
import { ProjectBlueprintSchema, TaskSchema } from "../schemas/claudeResponse";

/**
 * Persistence for user-owned ProjectBlueprints.
 *
 * Every function takes the owner's userId and scopes its queries to it, so a
 * caller can never read or modify another user's project (they just get null).
 */

// ---- Wire types ----------------------------------------------------------------

/** What the client sends: the generated blueprint plus UI state worth keeping. */
export const StoredBlueprintSchema = ProjectBlueprintSchema.extend({
  tasks: z.array(TaskSchema.extend({ completed: z.boolean().optional() })),
});
export type StoredBlueprint = z.infer<typeof StoredBlueprintSchema>;

export type SavedProject = StoredBlueprint & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export interface ProjectSummary {
  id: string;
  projectName: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  epicCount: number;
  storyCount: number;
  taskCount: number;
  completedTaskCount: number;
}

// ---- Reads -------------------------------------------------------------------------

const fullInclude = {
  productRequirementsDocument: true,
  epics: { orderBy: { position: "asc" } },
  userStories: { orderBy: { position: "asc" } },
  gherkinScenarios: { orderBy: { position: "asc" } },
  tasks: { orderBy: { position: "asc" } },
  priorities: { orderBy: { position: "asc" } },
} satisfies Prisma.ProjectInclude;

type FullProject = Prisma.ProjectGetPayload<{ include: typeof fullInclude }>;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

const priority = (value: string) => value as "High" | "Medium" | "Low";

function toSavedProject(p: FullProject): SavedProject {
  const prd = p.productRequirementsDocument;
  return {
    id: p.id,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    projectName: p.projectName,
    description: p.description,
    version: p.version,
    productRequirementsDocument: {
      overview: prd?.overview ?? "",
      targetAudience: prd?.targetAudience ?? "",
      scope: prd?.scope ?? "",
      objectives: strings(prd?.objectives),
      successMetrics: strings(prd?.successMetrics),
      outOfScope: strings(prd?.outOfScope),
    },
    epics: p.epics.map((e) => ({
      epicId: e.epicId,
      title: e.title,
      description: e.description,
      priority: priority(e.priority),
    })),
    userStories: p.userStories.map((s) => ({
      storyId: s.storyId,
      epicId: s.epicId,
      title: s.title,
      asA: s.asA,
      iWant: s.iWant,
      soThat: s.soThat,
      priority: priority(s.priority),
      acceptanceCriteria: strings(s.acceptanceCriteria),
    })),
    gherkinScenarios: p.gherkinScenarios.map((g) => ({
      scenarioId: g.scenarioId,
      storyId: g.storyId,
      feature: g.feature,
      scenario: g.scenario,
      given: g.given,
      when: g.when,
      then: g.then,
    })),
    tasks: p.tasks.map((t) => ({
      taskId: t.taskId,
      storyId: t.storyId,
      title: t.title,
      description: t.description,
      estimatedHours: Number(t.estimatedHours),
      priority: priority(t.priority),
      dependencies: strings(t.dependencies),
      completed: t.completed,
    })),
    priorities: p.priorities.map((pr) => ({
      priorityId: pr.priorityId,
      level: priority(pr.level),
      itemId: pr.itemId,
      rationale: pr.rationale,
    })),
  };
}

export async function listProjects(userId: string): Promise<ProjectSummary[]> {
  const rows = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { epics: true, userStories: true, tasks: true } },
      tasks: { where: { completed: true }, select: { id: true } },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    projectName: p.projectName,
    description: p.description,
    version: p.version,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    epicCount: p._count.epics,
    storyCount: p._count.userStories,
    taskCount: p._count.tasks,
    completedTaskCount: p.tasks.length,
  }));
}

export async function getProject(userId: string, id: string): Promise<SavedProject | null> {
  const p = await prisma.project.findFirst({ where: { id, userId }, include: fullInclude });
  return p ? toSavedProject(p) : null;
}

// ---- Writes -----------------------------------------------------------------------

type Tx = Prisma.TransactionClient;

/**
 * Inserts all child rows for a project. Parents go first because stories
 * reference epics and tasks/scenarios reference stories via composite FKs.
 */
async function insertChildren(tx: Tx, projectId: string, bp: StoredBlueprint): Promise<void> {
  const prd = bp.productRequirementsDocument;
  await tx.productRequirementsDocument.upsert({
    where: { projectId },
    create: { projectId, ...prd },
    update: prd,
  });

  await tx.epic.createMany({
    data: bp.epics.map((e, position) => ({ projectId, position, ...e })),
  });
  await tx.userStory.createMany({
    data: bp.userStories.map((s, position) => ({ projectId, position, ...s })),
  });
  await tx.gherkinScenario.createMany({
    data: bp.gherkinScenarios.map((g, position) => ({ projectId, position, ...g })),
  });
  await tx.task.createMany({
    data: bp.tasks.map(({ completed, ...t }, position) => ({
      projectId,
      position,
      completed: completed ?? false,
      ...t,
    })),
  });
  await tx.priority.createMany({
    data: bp.priorities.map((p, position) => ({ projectId, position, ...p })),
  });
}

/** Translates FK / unique violations into a 400 the client can show. */
function rethrowAsHttp(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2003") {
      throw new HttpError(400, "Blueprint references an epic or story that does not exist.");
    }
    if (err.code === "P2002") {
      throw new HttpError(400, "Blueprint contains duplicate ids (epicId / storyId / taskId must be unique).");
    }
  }
  throw err;
}

export async function createProject(userId: string, bp: StoredBlueprint): Promise<SavedProject> {
  const id = await prisma
    .$transaction(async (tx) => {
      const project = await tx.project.create({
        data: { userId, projectName: bp.projectName, description: bp.description, version: bp.version },
        select: { id: true },
      });
      await insertChildren(tx, project.id, bp);
      return project.id;
    })
    .catch(rethrowAsHttp);

  return (await getProject(userId, id))!;
}

/** Replaces the whole blueprint. Children are rebuilt so ordering and deletions stick. */
export async function replaceProject(
  userId: string,
  id: string,
  bp: StoredBlueprint,
): Promise<SavedProject | null> {
  const owned = await prisma.project.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) return null;

  await prisma
    .$transaction(async (tx) => {
      await tx.project.update({
        where: { id },
        data: { projectName: bp.projectName, description: bp.description, version: bp.version },
      });
      // Deleting epics cascades to stories → tasks / scenarios.
      await tx.epic.deleteMany({ where: { projectId: id } });
      await tx.userStory.deleteMany({ where: { projectId: id } }); // stories with a dangling epic
      await tx.priority.deleteMany({ where: { projectId: id } });
      await insertChildren(tx, id, bp);
    })
    .catch(rethrowAsHttp);

  return getProject(userId, id);
}

export async function deleteProject(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.project.deleteMany({ where: { id, userId } });
  return count > 0;
}
