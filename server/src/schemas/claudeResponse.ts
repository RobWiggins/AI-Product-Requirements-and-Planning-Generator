import { z } from "zod";

const PriorityLevel = z.enum(["High", "Medium", "Low"]);

const ProductRequirementsDocumentSchema = z.object({
  overview: z.string(),
  objectives: z.array(z.string()),
  targetAudience: z.string(),
  successMetrics: z.array(z.string()),
  scope: z.string(),
  outOfScope: z.array(z.string()),
});

const EpicSchema = z.object({
  epicId: z.string(),
  title: z.string(),
  description: z.string(),
  priority: PriorityLevel,
});

const UserStorySchema = z.object({
  storyId: z.string(),
  epicId: z.string(),
  title: z.string(),
  asA: z.string(),
  iWant: z.string(),
  soThat: z.string(),
  priority: PriorityLevel,
  acceptanceCriteria: z.array(z.string()),
});

const GherkinScenarioSchema = z.object({
  scenarioId: z.string(),
  storyId: z.string(),
  feature: z.string(),
  scenario: z.string(),
  given: z.string(),
  when: z.string(),
  then: z.string(),
});

const TaskSchema = z.object({
  taskId: z.string(),
  storyId: z.string(),
  title: z.string(),
  description: z.string(),
  estimatedHours: z.number(),
  priority: PriorityLevel,
  dependencies: z.array(z.string()),
});

const PriorityItemSchema = z.object({
  priorityId: z.string(),
  level: PriorityLevel,
  itemId: z.string(),
  rationale: z.string(),
});

const ProjectBlueprintSchema = z.object({
  projectName: z.string(),
  description: z.string(),
  version: z.string(),
  productRequirementsDocument: ProductRequirementsDocumentSchema,
  epics: z.array(EpicSchema),
  userStories: z.array(UserStorySchema),
  gherkinScenarios: z.array(GherkinScenarioSchema),
  tasks: z.array(TaskSchema),
  priorities: z.array(PriorityItemSchema),
});

const ClaudeContentItemSchema = z.object({
  type: z.literal("text"),
  text: z.object({
    ProjectBlueprint: ProjectBlueprintSchema,
  }),
});

export const ClaudeResponseSchema = z.object({
  content: z.array(ClaudeContentItemSchema),
});

export type ClaudeResponse = z.infer<typeof ClaudeResponseSchema>;
export type ProjectBlueprint = z.infer<typeof ProjectBlueprintSchema>;
export type Epic = z.infer<typeof EpicSchema>;
export type UserStory = z.infer<typeof UserStorySchema>;
export type GherkinScenario = z.infer<typeof GherkinScenarioSchema>;
export type Task = z.infer<typeof TaskSchema>;
