import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "@client/store";
import type { RootState } from "@client/store";
import { sampleBlueprint } from "./fixtures";
import {
  blueprintCleared,
  blueprintLoaded,
  epicDeleted,
  epicUpdated,
  selectIsDirty,
  selectAllStories,
  selectAllTasks,
  selectScenariosForStory,
  selectStoredBlueprint,
  selectStoriesForEpic,
  selectStoryCountByEpic,
  selectTaskProgress,
  selectTasksForStory,
  storiesReordered,
  prdUpdated,
  storyAdded,
  storyDeleted,
  taskToggled,
  taskUpdated,
} from "@client/store/slices/blueprintSlice";
import { saveNewProject, updateProject } from "@client/store/slices/projectsSlice";

const sample = sampleBlueprint;

const makeStore = () => configureStore({ reducer: rootReducer });
const state = (store: ReturnType<typeof makeStore>) => store.getState() as RootState;

describe("blueprintSlice", () => {
  it("loads a blueprint into normalised entities and de-normalises it back unchanged", () => {
    const store = makeStore();
    store.dispatch(blueprintLoaded(sample));

    const s = state(store);
    expect(selectAllStories(s).map((x) => x.storyId)).toEqual(["S1", "S2", "S3"]);
    expect(selectStoryCountByEpic(s)).toEqual({ E1: 2, E2: 1 });
    expect(selectTaskProgress(s)).toEqual({ total: 3, done: 1 });
    expect(selectIsDirty(s)).toBe(false);

    // Round-trip: tasks gain an explicit `completed` flag, everything else is identical.
    const stored = selectStoredBlueprint(s)!;
    expect(stored).toEqual({
      ...sample,
      tasks: sample.tasks.map((t) => ({ ...t, completed: t.completed ?? false })),
    });
  });

  it("returns the same de-normalised object until something changes (memoised)", () => {
    const store = makeStore();
    store.dispatch(blueprintLoaded(sample));
    const a = selectStoredBlueprint(state(store));
    const b = selectStoredBlueprint(state(store));
    expect(a).toBe(b);

    store.dispatch(taskToggled("T1"));
    expect(selectStoredBlueprint(state(store))).not.toBe(a);
  });

  it("edits the product requirements document and includes it in the saved payload", () => {
    const store = makeStore();
    store.dispatch(blueprintLoaded(sample));
    store.dispatch(prdUpdated({ overview: "A clearer overview.", targetAudience: "City dog owners" }));
    store.dispatch(prdUpdated({ objectives: ["Find dogs", "Book a slot"], outOfScope: ["Payments", "Chat"] }));

    const stored = selectStoredBlueprint(state(store))!;
    expect(stored.productRequirementsDocument.overview).toBe("A clearer overview.");
    expect(stored.productRequirementsDocument.targetAudience).toBe("City dog owners");
    expect(stored.productRequirementsDocument.objectives).toEqual(["Find dogs", "Book a slot"]);
    expect(stored.productRequirementsDocument.outOfScope).toEqual(["Payments", "Chat"]);
    expect(stored.productRequirementsDocument.scope).toBe(sample.productRequirementsDocument.scope);
    expect(selectIsDirty(state(store))).toBe(true);
  });

  it("toggles and edits tasks, marking the document dirty", () => {
    const store = makeStore();
    store.dispatch(blueprintLoaded(sample));

    store.dispatch(taskToggled("T1"));
    store.dispatch(taskUpdated({ id: "T3", changes: { title: "Calendar sync", estimatedHours: 10 } }));

    const s = state(store);
    const tasks = Object.fromEntries(selectAllTasks(s).map((t) => [t.taskId, t]));
    expect(tasks.T1.completed).toBe(true);
    expect(tasks.T2.completed).toBe(true);
    expect(tasks.T3).toMatchObject({ title: "Calendar sync", estimatedHours: 10, completed: false });
    expect(selectTaskProgress(s)).toEqual({ total: 3, done: 2 });
    expect(selectIsDirty(s)).toBe(true);
  });

  it("deleting a story cascades to its tasks and scenarios only", () => {
    const store = makeStore();
    store.dispatch(blueprintLoaded(sample));
    store.dispatch(storyDeleted("S1"));

    const s = state(store);
    expect(selectAllStories(s).map((x) => x.storyId)).toEqual(["S2", "S3"]);
    expect(selectAllTasks(s).map((t) => t.taskId)).toEqual(["T3"]);
    expect(selectScenariosForStory(s, "S1")).toEqual([]);
    expect(selectScenariosForStory(s, "S3")).toHaveLength(1);
  });

  it("deleting an epic cascades through its stories to tasks and scenarios", () => {
    const store = makeStore();
    store.dispatch(blueprintLoaded(sample));
    store.dispatch(epicDeleted("E1"));

    const s = state(store);
    expect(selectStoredBlueprint(s)!.epics.map((e) => e.epicId)).toEqual(["E2"]);
    expect(selectAllStories(s).map((x) => x.storyId)).toEqual(["S3"]);
    expect(selectAllTasks(s).map((t) => t.taskId)).toEqual(["T3"]);
    expect(selectStoredBlueprint(s)!.gherkinScenarios.map((g) => g.scenarioId)).toEqual(["G3"]);
  });

  it("adds new stories at the top of their epic and reorders within an epic only", () => {
    const store = makeStore();
    store.dispatch(blueprintLoaded(sample));

    store.dispatch(storyAdded({ storyId: "S4", epicId: "E1", title: "New", asA: "u", iWant: "w", soThat: "s", priority: "Medium", acceptanceCriteria: [] }));
    expect(selectStoriesForEpic(state(store), "E1").map((x) => x.storyId)).toEqual(["S4", "S1", "S2"]);

    store.dispatch(storiesReordered({ epicId: "E1", orderedIds: ["S2", "S1", "S4"] }));
    const s = state(store);
    expect(selectStoriesForEpic(s, "E1").map((x) => x.storyId)).toEqual(["S2", "S1", "S4"]);
    // E2's story is untouched and the saved order reflects the reorder.
    expect(selectStoriesForEpic(s, "E2").map((x) => x.storyId)).toEqual(["S3"]);
    expect(selectStoredBlueprint(s)!.userStories.map((x) => x.storyId)).toEqual(["S2", "S1", "S4", "S3"]);
  });

  it("stays dirty when edits arrive while a save is in flight", () => {
    const store = makeStore();
    store.dispatch(blueprintLoaded(sample));
    store.dispatch(epicUpdated({ id: "E1", changes: { title: "Matching v2" } })); // revision 1
    const snapshot = selectStoredBlueprint(state(store))!;

    // Autosave kicks off for revision 1; the user keeps typing (revision 2).
    store.dispatch(epicUpdated({ id: "E1", changes: { title: "Matching v3" } }));
    store.dispatch(updateProject.fulfilled({ ...snapshot, id: "p1", createdAt: "", updatedAt: "" }, "req", { id: "p1", blueprint: snapshot, revision: 1 }));
    expect(selectIsDirty(state(store))).toBe(true);

    // A save of the latest revision cleans it.
    store.dispatch(updateProject.fulfilled({ ...snapshot, id: "p1", createdAt: "", updatedAt: "" }, "req2", { id: "p1", blueprint: snapshot, revision: 2 }));
    expect(selectIsDirty(state(store))).toBe(false);
  });

  it("marks a freshly generated blueprint clean once created on the server", () => {
    const store = makeStore();
    store.dispatch(blueprintLoaded(sample));
    store.dispatch(taskToggled("T1")); // edit before the POST resolved
    store.dispatch(saveNewProject.fulfilled({ ...sample, id: "p1", createdAt: "", updatedAt: "" }, "req", { blueprint: sample, revision: 0 }));
    expect(selectIsDirty(state(store))).toBe(true); // revision 1 still unsaved

    store.dispatch(blueprintCleared());
    expect(selectStoredBlueprint(state(store))).toBeNull();
    expect(selectTasksForStory(state(store), "S1")).toEqual([]);
  });
});
