import Anthropic from "@anthropic-ai/sdk";

import { z } from "zod";

// export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// export const ai = new Anthropic()

// const client = new Anthropic();

// ! Fix schema to match claude response format, and
// ! ensure it is properly validated in the backend before 
// ! being sent to the frontend.

// export const GENERATION_SCHEMA = {
//   type: Type.OBJECT,
//   properties: {
//     goal: { type: Type.STRING },
//     epics: {
//       type: Type.ARRAY,
//       items: {
//         type: Type.OBJECT,
//         properties: {
//           id: { type: Type.STRING },
//           title: { type: Type.STRING },
//           description: { type: Type.STRING },
//           order: { type: Type.INTEGER },
//           stories: {
//             type: Type.ARRAY,
//             items: {
//               type: Type.OBJECT,
//               properties: {
//                 id: { type: Type.STRING },
//                 title: { type: Type.STRING },
//                 description: { type: Type.STRING },
//                 acceptanceCriteria: {
//                   type: Type.ARRAY,
//                   items: { type: Type.STRING },
//                 },
//                 gherkin: { type: Type.STRING },
//                 tasks: {
//                   type: Type.ARRAY,
//                   items: {
//                     type: Type.OBJECT,
//                     properties: {
//                       id: { type: Type.STRING },
//                       title: { type: Type.STRING },
//                       status: { type: Type.STRING, enum: ["todo", "done"] },
//                     },
//                     required: ["id", "title", "status"],
//                   },
//                 },
//                 priority: { type: Type.STRING, enum: ["low", "medium", "high"] },
//                 order: { type: Type.INTEGER },
//               },
//               required: [
//                 "id", "title", "description", "acceptanceCriteria",
//                 "gherkin", "tasks", "priority", "order",
//               ],
//             },
//           },
//         },
//         required: ["id", "title", "description", "order", "stories"],
//       },
//     },
//   },
//   required: ["goal", "epics"],
// };

export const SYSTEM_INSTRUCTION = `You are StoryMorph, an elite technical PM and systems architect.
You transform abstract project goals into production-ready backlogs.
Generate realistic UUIDs for IDs.
Use professional Gherkin syntax.
Tasks should be technical and actionable.
Ensure Epics represent high-level architectural domains.
User stories must follow the 'As a [role], I want [action], so that [value]' format.`;



// export const PriorityLevelSchema = z.enum(["High", "Medium", "Low"]);

// export const ProductRequirementsDocumentSchema = z.object({
//   overview: z.string(),
//   objectives: z.array(z.string()),
//   targetAudience: z.string(),
//   successMetrics: z.array(z.string()),
//   scope: z.string(),
//   outOfScope: z.array(z.string()),
// });

// const EpicSchema = z.object({
//   epicId: z.string(),
//   title: z.string(),
//   description: z.string(),
//   priority: PriorityLevelSchema,
// });

// export const UserStorySchema = z.object({
//   storyId: z.string(),
//   epicId: z.string(),
//   title: z.string(),
//   asA: z.string(),
//   iWant: z.string(),
//   soThat: z.string(),
//   priority: PriorityLevelSchema,
//   acceptanceCriteria: z.array(z.string()),
// });

// export const GherkinScenarioSchema = z.object({
//   scenarioId: z.string(),
//   storyId: z.string(),
//   feature: z.string(),
//   scenario: z.string(),
//   given: z.string(),
//   when: z.string(),t
//   then: z.string(),
// });

// export const TaskSchema = z.object({
//   taskId: z.string(),
//   storyId: z.string(),
//   title: z.string(),
//   description: z.string(),
//   estimatedHours: z.number(),
//   priority: PriorityLevelSchema,
//   dependencies: z.array(z.string()),
// });

// export const PrioritySchema = z.object({
//   priorityId: z.string(),
//   level: PriorityLevelSchema,
//   itemId: z.string(),
//   rationale: z.string(),
// });

// export const ProjectBlueprintSchema = z.object({
//   projectName: z.string(),
//   description: z.string(),
//   version: z.string(),
//   productRequirementsDocument: ProductRequirementsDocumentSchema,
//   epics: z.array(EpicSchema),
//   userStories: z.array(UserStorySchema),
//   gherkinScenarios: z.array(GherkinScenarioSchema),
//   tasks: z.array(TaskSchema),
//   priorities: z.array(PrioritySchema),
// });

// export const ExampleResponseSchema = z.object({
//   ProjectBlueprint: ProjectBlueprintSchema,
// });

// // Optional inferred TypeScript type
// export type ExampleResponse = z.infer<typeof ExampleResponseSchema>;









































export const PriorityLevel = z.enum(["High", "Medium", "Low"]);

export const ProductRequirementsDocumentSchema = z.object({
  overview: z.string(),
  objectives: z.array(z.string()),
  targetAudience: z.string(),
  successMetrics: z.array(z.string()),
  scope: z.string(),
  outOfScope: z.array(z.string()),
});

export const EpicSchema = z.object({
  epicId: z.string(),
  title: z.string(),
  description: z.string(),
  priority: PriorityLevel,
});

export const UserStorySchema = z.object({
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

export const TaskSchema = z.object({
  taskId: z.string(),
  storyId: z.string(),
  title: z.string(),
  description: z.string(),
  estimatedHours: z.number(),
  priority: PriorityLevel,
  dependencies: z.array(z.string()),
});

export const PriorityItemSchema = z.object({
  priorityId: z.string(),
  level: PriorityLevel,
  itemId: z.string(),
  rationale: z.string(),
});

export const ProjectBlueprintSchema = z.object({
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

export const ClaudeContentItemSchema = z.object({
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
