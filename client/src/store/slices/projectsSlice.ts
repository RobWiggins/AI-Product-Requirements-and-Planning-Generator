import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ApiError, projectsApi, ProjectSummary, SavedProject, StoredBlueprint } from "../../lib/api";
import { signOut } from "./authSlice";

/**
 * The signed-in user's saved projects (summaries) and the persistence state of
 * the project currently open in the workspace. The blueprint being edited lives
 * in Workspace state; this slice only tracks which saved row it maps to and
 * whether the latest edits have reached the server.
 */
export type SaveState = "idle" | "saving" | "saved" | "error";

export interface ProjectsState {
  items: ProjectSummary[];
  listStatus: "idle" | "loading" | "ready" | "error";
  listError: string | null;
  /** Saved project the workspace is editing, or null for an unsaved draft. */
  currentId: string | null;
  saveState: SaveState;
  saveError: string | null;
}

const initialState: ProjectsState = {
  items: [],
  listStatus: "idle",
  listError: null,
  currentId: null,
  saveState: "idle",
  saveError: null,
};

const message = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : err instanceof Error ? err.message : fallback;

export const fetchProjects = createAsyncThunk("projects/fetch", async (_, { rejectWithValue }) => {
  try {
    return await projectsApi.list();
  } catch (err) {
    return rejectWithValue(message(err, "Could not load your projects."));
  }
});

/**
 * `revision` is the blueprint slice's edit counter at the time of the save.
 * The blueprint slice reads it from `action.meta.arg` on success so it can tell
 * whether edits made during the request still need saving.
 */
export const saveNewProject = createAsyncThunk(
  "projects/create",
  async ({ blueprint }: { blueprint: StoredBlueprint; revision?: number }, { rejectWithValue }) => {
    try {
      return await projectsApi.create(blueprint);
    } catch (err) {
      return rejectWithValue(message(err, "Could not save the project."));
    }
  },
);

export const updateProject = createAsyncThunk(
  "projects/update",
  async (
    { id, blueprint }: { id: string; blueprint: StoredBlueprint; revision?: number },
    { rejectWithValue },
  ) => {
    try {
      return await projectsApi.replace(id, blueprint);
    } catch (err) {
      return rejectWithValue(message(err, "Could not save your changes."));
    }
  },
);

export const loadProject = createAsyncThunk("projects/load", async (id: string, { rejectWithValue }) => {
  try {
    return await projectsApi.get(id);
  } catch (err) {
    return rejectWithValue(message(err, "Could not open that project."));
  }
});

export const removeProject = createAsyncThunk("projects/remove", async (id: string, { rejectWithValue }) => {
  try {
    await projectsApi.remove(id);
    return id;
  } catch (err) {
    return rejectWithValue(message(err, "Could not delete the project."));
  }
});

/** Merge a full SavedProject into the summary list (newest first). */
function upsertSummary(items: ProjectSummary[], p: SavedProject): ProjectSummary[] {
  const summary: ProjectSummary = {
    id: p.id,
    projectName: p.projectName,
    description: p.description,
    version: p.version,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    epicCount: p.epics.length,
    storyCount: p.userStories.length,
    taskCount: p.tasks.length,
    completedTaskCount: p.tasks.filter((t) => t.completed).length,
  };
  return [summary, ...items.filter((i) => i.id !== p.id)];
}

export const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    setCurrentProject(state, action: PayloadAction<string | null>) {
      state.currentId = action.payload;
      state.saveState = "idle";
      state.saveError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.listStatus = "loading";
        state.listError = null;
      })
      .addCase(fetchProjects.fulfilled, (state, { payload }) => {
        state.listStatus = "ready";
        state.items = payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.listStatus = "error";
        state.listError = (action.payload as string) ?? "Could not load your projects.";
      })

      .addCase(saveNewProject.pending, (state) => {
        state.saveState = "saving";
        state.saveError = null;
      })
      .addCase(saveNewProject.fulfilled, (state, { payload }) => {
        state.saveState = "saved";
        state.currentId = payload.id;
        state.items = upsertSummary(state.items, payload);
      })
      .addCase(saveNewProject.rejected, (state, action) => {
        state.saveState = "error";
        state.saveError = (action.payload as string) ?? "Could not save the project.";
      })

      .addCase(updateProject.pending, (state) => {
        state.saveState = "saving";
        state.saveError = null;
      })
      .addCase(updateProject.fulfilled, (state, { payload }) => {
        state.saveState = "saved";
        state.items = upsertSummary(state.items, payload);
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.saveState = "error";
        state.saveError = (action.payload as string) ?? "Could not save your changes.";
      })

      .addCase(loadProject.fulfilled, (state, { payload }) => {
        state.currentId = payload.id;
        state.saveState = "saved";
        state.saveError = null;
      })
      .addCase(loadProject.rejected, (state, action) => {
        state.listError = (action.payload as string) ?? "Could not open that project.";
      })

      .addCase(removeProject.fulfilled, (state, { payload: id }) => {
        state.items = state.items.filter((i) => i.id !== id);
        if (state.currentId === id) state.currentId = null;
      })
      .addCase(removeProject.rejected, (state, action) => {
        state.listError = (action.payload as string) ?? "Could not delete the project.";
      })

      // A new visitor must never see the previous user's list.
      .addCase(signOut.fulfilled, () => initialState)
      .addCase(signOut.rejected, () => initialState);
  },
});

export const { setCurrentProject } = projectsSlice.actions;
export default projectsSlice.reducer;
