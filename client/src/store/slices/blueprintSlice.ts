import { createEntityAdapter, createSelector, createSlice, type EntityState, type PayloadAction } from "@reduxjs/toolkit";
import type { Epic, GherkinScenario, ProjectBlueprint, Task, UserStory } from "../../lib/ai";
import type { StoredBlueprint } from "../../lib/api";
import type { RootState } from "..";
import { signOut } from "./authSlice";
import { saveNewProject, updateProject } from "./projectsSlice";

/**
 * The document being edited, normalised by id.
 *
 *   meta      – project-level fields (name, PRD, priorities…)
 *   epics     – EntityState<Epic>
 *   stories   – EntityState<UserStory>          (story.epicId → epic)
 *   scenarios – EntityState<GherkinScenario>    (scenario.storyId → story)
 *   tasks     – EntityState<EditableTask>       (task.storyId → story, + completed)
 *
 * Every edit bumps `revision`; a successful save records `savedRevision`.
 * `dirty` is simply revision !== savedRevision, which stays correct even if
 * the user keeps typing while a save is in flight.
 */

export type EditableTask = Task & { completed: boolean };

export type BlueprintMeta = Omit<ProjectBlueprint, "epics" | "userStories" | "gherkinScenarios" | "tasks">;
export type ProductRequirements = ProjectBlueprint["productRequirementsDocument"];

const epics = createEntityAdapter<Epic, string>({ selectId: (e) => e.epicId });
const stories = createEntityAdapter<UserStory, string>({ selectId: (s) => s.storyId });
const scenarios = createEntityAdapter<GherkinScenario, string>({ selectId: (g) => g.scenarioId });
const tasks = createEntityAdapter<EditableTask, string>({ selectId: (t) => t.taskId });

export interface BlueprintState {
  meta: BlueprintMeta | null;
  epics: EntityState<Epic, string>;
  stories: EntityState<UserStory, string>;
  scenarios: EntityState<GherkinScenario, string>;
  tasks: EntityState<EditableTask, string>;
  revision: number;
  savedRevision: number;
}

const initialState: BlueprintState = {
  meta: null,
  epics: epics.getInitialState(),
  stories: stories.getInitialState(),
  scenarios: scenarios.getInitialState(),
  tasks: tasks.getInitialState(),
  revision: 0,
  savedRevision: 0,
};

type Update<T> = { id: string; changes: Partial<T> };

const touch = (state: BlueprintState) => {
  state.revision += 1;
};

const removeStoriesChildren = (state: BlueprintState, storyIds: Set<string>) => {
  tasks.removeMany(
    state.tasks,
    state.tasks.ids.filter((id) => storyIds.has(state.tasks.entities[id]!.storyId)),
  );
  scenarios.removeMany(
    state.scenarios,
    state.scenarios.ids.filter((id) => storyIds.has(state.scenarios.entities[id]!.storyId)),
  );
};

export const blueprintSlice = createSlice({
  name: "blueprint",
  initialState,
  reducers: {
    /** Replace the document with a freshly generated or loaded blueprint. Not dirty. */
    blueprintLoaded(_state, { payload }: PayloadAction<ProjectBlueprint | StoredBlueprint>) {
      const { epics: e, userStories, gherkinScenarios, tasks: t, ...meta } = payload;
      return {
        meta,
        epics: epics.setAll(epics.getInitialState(), e),
        stories: stories.setAll(stories.getInitialState(), userStories),
        scenarios: scenarios.setAll(scenarios.getInitialState(), gherkinScenarios),
        tasks: tasks.setAll(
          tasks.getInitialState(),
          t.map((task) => ({ ...task, completed: "completed" in task && !!task.completed })),
        ),
        revision: 0,
        savedRevision: 0,
      };
    },
    blueprintCleared: () => initialState,

    /** Patch the product requirements document (overview, audience, scope, lists). */
    prdUpdated(state, { payload }: PayloadAction<Partial<ProductRequirements>>) {
      if (!state.meta) return;
      state.meta.productRequirementsDocument = { ...state.meta.productRequirementsDocument, ...payload };
      touch(state);
    },

    // ---- Epics ------------------------------------------------------------
    epicAdded(state, { payload }: PayloadAction<Epic>) {
      epics.addOne(state.epics, payload);
      touch(state);
    },
    epicUpdated(state, { payload }: PayloadAction<Update<Epic>>) {
      epics.updateOne(state.epics, payload);
      touch(state);
    },
    epicDeleted(state, { payload: epicId }: PayloadAction<string>) {
      const storyIds = new Set(state.stories.ids.filter((id) => state.stories.entities[id]!.epicId === epicId));
      removeStoriesChildren(state, storyIds);
      stories.removeMany(state.stories, [...storyIds]);
      epics.removeOne(state.epics, epicId);
      touch(state);
    },

    // ---- Stories ----------------------------------------------------------
    /** New stories go to the top of their epic's list. */
    storyAdded(state, { payload }: PayloadAction<UserStory>) {
      stories.addOne(state.stories, payload);
      const ids = state.stories.ids;
      ids.splice(ids.indexOf(payload.storyId), 1);
      ids.unshift(payload.storyId);
      touch(state);
    },
    storyUpdated(state, { payload }: PayloadAction<Update<UserStory>>) {
      stories.updateOne(state.stories, payload);
      touch(state);
    },
    storyDeleted(state, { payload: storyId }: PayloadAction<string>) {
      removeStoriesChildren(state, new Set([storyId]));
      stories.removeOne(state.stories, storyId);
      touch(state);
    },
    /** Reorder one epic's stories; stories of other epics keep their relative order. */
    storiesReordered(state, { payload }: PayloadAction<{ epicId: string; orderedIds: string[] }>) {
      const others = state.stories.ids.filter((id) => state.stories.entities[id]!.epicId !== payload.epicId);
      state.stories.ids = [...payload.orderedIds, ...others];
      touch(state);
    },

    // ---- Gherkin scenarios ------------------------------------------------
    scenarioAdded(state, { payload }: PayloadAction<GherkinScenario>) {
      scenarios.addOne(state.scenarios, payload);
      touch(state);
    },
    scenarioUpdated(state, { payload }: PayloadAction<Update<GherkinScenario>>) {
      scenarios.updateOne(state.scenarios, payload);
      touch(state);
    },
    scenarioDeleted(state, { payload }: PayloadAction<string>) {
      scenarios.removeOne(state.scenarios, payload);
      touch(state);
    },

    // ---- Tasks ------------------------------------------------------------
    taskAdded(state, { payload }: PayloadAction<Task & { completed?: boolean }>) {
      tasks.addOne(state.tasks, { ...payload, completed: payload.completed ?? false });
      touch(state);
    },
    taskUpdated(state, { payload }: PayloadAction<Update<EditableTask>>) {
      tasks.updateOne(state.tasks, payload);
      touch(state);
    },
    taskToggled(state, { payload: taskId }: PayloadAction<string>) {
      const task = state.tasks.entities[taskId];
      if (!task) return;
      task.completed = !task.completed;
      touch(state);
    },
    taskDeleted(state, { payload }: PayloadAction<string>) {
      tasks.removeOne(state.tasks, payload);
      touch(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveNewProject.fulfilled, (state, action) => {
        state.savedRevision = action.meta.arg.revision ?? state.revision;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.savedRevision = action.meta.arg.revision ?? state.revision;
      })
      .addCase(signOut.fulfilled, () => initialState)
      .addCase(signOut.rejected, () => initialState);
  },
});

export const {
  blueprintLoaded,
  blueprintCleared,
  prdUpdated,
  epicAdded,
  epicUpdated,
  epicDeleted,
  storyAdded,
  storyUpdated,
  storyDeleted,
  storiesReordered,
  scenarioAdded,
  scenarioUpdated,
  scenarioDeleted,
  taskAdded,
  taskUpdated,
  taskToggled,
  taskDeleted,
} = blueprintSlice.actions;

export default blueprintSlice.reducer;

// ---- Selectors ---------------------------------------------------------------

const selectSlice = (state: RootState) => state.blueprint;

export const selectBlueprintMeta = (state: RootState) => state.blueprint.meta;
export const selectHasBlueprint = (state: RootState) => state.blueprint.meta !== null;
export const selectIsDirty = (state: RootState) => state.blueprint.revision !== state.blueprint.savedRevision;
export const selectRevision = (state: RootState) => state.blueprint.revision;

const epicSelectors = epics.getSelectors((state: RootState) => state.blueprint.epics);
const storySelectors = stories.getSelectors((state: RootState) => state.blueprint.stories);
const scenarioSelectors = scenarios.getSelectors((state: RootState) => state.blueprint.scenarios);
const taskSelectors = tasks.getSelectors((state: RootState) => state.blueprint.tasks);

export const selectAllEpics = epicSelectors.selectAll;
export const selectEpicById = epicSelectors.selectById;
export const selectAllStories = storySelectors.selectAll;
export const selectAllScenarios = scenarioSelectors.selectAll;
export const selectAllTasks = taskSelectors.selectAll;

const idArg = (_: RootState, id: string) => id;

export const selectEpicIndex = createSelector([selectAllEpics, idArg], (all, epicId) =>
  all.findIndex((e) => e.epicId === epicId),
);

export const selectStoriesForEpic = createSelector([selectAllStories, idArg], (all, epicId) =>
  all.filter((s) => s.epicId === epicId),
);

export const selectTasksForStory = createSelector([selectAllTasks, idArg], (all, storyId) =>
  all.filter((t) => t.storyId === storyId),
);

export const selectScenariosForStory = createSelector([selectAllScenarios, idArg], (all, storyId) =>
  all.filter((g) => g.storyId === storyId),
);

/** epicId → number of stories, for sidebar / overview badges. */
export const selectStoryCountByEpic = createSelector([selectAllStories], (all) => {
  const counts: Record<string, number> = {};
  for (const s of all) counts[s.epicId] = (counts[s.epicId] ?? 0) + 1;
  return counts;
});

/** Per-epic story/task counts for the overview map. */
export const selectEpicSummaries = createSelector(
  [selectAllEpics, selectAllStories, selectAllTasks],
  (epics, allStories, allTasks) =>
    epics.map((epic, index) => {
      const stories = allStories.filter((s) => s.epicId === epic.epicId);
      const storyIds = new Set(stories.map((s) => s.storyId));
      const tasks = allTasks.filter((t) => storyIds.has(t.storyId));
      const done = tasks.filter((t) => t.completed).length;
      return { epic, index, storyCount: stories.length, taskCount: tasks.length, done };
    }),
);

export const selectTaskProgress = createSelector([selectAllTasks], (all) => ({
  total: all.length,
  done: all.filter((t) => t.completed).length,
}));

/** De-normalise back into the API shape. Memoised: same object until something changes. */
export const selectStoredBlueprint = createSelector(
  [selectSlice, selectAllEpics, selectAllStories, selectAllScenarios, selectAllTasks],
  (slice, e, s, g, t): StoredBlueprint | null =>
    slice.meta
      ? { ...slice.meta, epics: e, userStories: s, gherkinScenarios: g, tasks: t }
      : null,
);
