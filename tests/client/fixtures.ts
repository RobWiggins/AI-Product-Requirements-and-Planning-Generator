import type { StoredBlueprint } from "@client/lib/api";

export const sampleBlueprint: StoredBlueprint = {
  projectName: "Dog Playdates",
  description: "Safe playdates for dogs nearby.",
  version: "0.1.0",
  productRequirementsDocument: {
    overview: "Match dog owners.",
    objectives: ["Find compatible dogs"],
    targetAudience: "Urban dog owners",
    successMetrics: ["Weekly playdates"],
    scope: "Matching",
    outOfScope: ["Payments"],
  },
  epics: [
    { epicId: "E1", title: "Matching", description: "Find dogs", priority: "High" },
    { epicId: "E2", title: "Scheduling", description: "Book", priority: "Medium" },
  ],
  userStories: [
    { storyId: "S1", epicId: "E1", title: "Browse", asA: "owner", iWant: "browse", soThat: "pick", priority: "High", acceptanceCriteria: ["a"] },
    { storyId: "S2", epicId: "E1", title: "Filter", asA: "owner", iWant: "filter", soThat: "narrow", priority: "Medium", acceptanceCriteria: ["b"] },
    { storyId: "S3", epicId: "E2", title: "Book slot", asA: "owner", iWant: "book", soThat: "meet", priority: "Low", acceptanceCriteria: ["c"] },
  ],
  gherkinScenarios: [
    { scenarioId: "G1", storyId: "S1", feature: "Matching", scenario: "See dogs", given: "profile", when: "open", then: "list" },
    { scenarioId: "G3", storyId: "S3", feature: "Scheduling", scenario: "Book", given: "match", when: "pick time", then: "confirmed" },
  ],
  tasks: [
    { taskId: "T1", storyId: "S1", title: "Geo query", description: "", estimatedHours: 6, priority: "High", dependencies: [] },
    { taskId: "T2", storyId: "S1", title: "List UI", description: "", estimatedHours: 4, priority: "Medium", dependencies: ["T1"], completed: true },
    { taskId: "T3", storyId: "S3", title: "Calendar", description: "", estimatedHours: 8, priority: "Low", dependencies: [] },
  ],
  priorities: [{ priorityId: "P1", level: "High", itemId: "E1", rationale: "Core" }],
};
