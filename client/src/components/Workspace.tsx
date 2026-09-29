import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Epic, ProjectBlueprint, UserStory } from "../lib/ai";
import { ApiError, generateApi, type AuthUser, type OAuthProviderName, type SavedProject, type StoredBlueprint, authApi } from "../lib/api";
import { useAppDispatch, useAppSelector } from "../hooks";
import { bootstrapSession, signOut } from "../store/slices/authSlice";
import {
  fetchProjects,
  loadProject,
  removeProject,
  saveNewProject,
  setCurrentProject,
  updateProject,
} from "../store/slices/projectsSlice";
import DraftingOverlay from "./DraftingOverlay";
import EpicCanvas from "./EpicCanvas";
import EpicSidebar from "./EpicSidebar";
import Footer from "./Footer";
import GoalInput from "./GoalInput";
import Header, { type WorkspaceView } from "./Header";
import OverviewPanel from "./OverviewPanel";
import ProjectList from "./ProjectList";
import Tweaks, { type TweakSettings } from "./Tweaks";
import UserMenu from "./UserMenu";

/** Debounce for pushing edits to the server. */
const AUTOSAVE_MS = 1200;

interface Props {
  user: AuthUser;
  settings: TweakSettings;
  onSetSettings: (patch: Partial<TweakSettings>) => void;
}

/** Local editor state + the `completed` flags → the shape the API stores. */
function toStored(blueprint: ProjectBlueprint, completed: Set<string>): StoredBlueprint {
  return {
    ...blueprint,
    tasks: blueprint.tasks.map((t) => ({ ...t, completed: completed.has(t.taskId) })),
  };
}

/** Saved row → editor state. */
function fromSaved(saved: SavedProject): { blueprint: ProjectBlueprint; completed: Set<string> } {
  const completed = new Set(saved.tasks.filter((t) => t.completed).map((t) => t.taskId));
  return {
    blueprint: {
      projectName: saved.projectName,
      description: saved.description,
      version: saved.version,
      productRequirementsDocument: saved.productRequirementsDocument,
      epics: saved.epics,
      userStories: saved.userStories,
      gherkinScenarios: saved.gherkinScenarios,
      tasks: saved.tasks.map(({ completed: _c, ...task }) => task),
      priorities: saved.priorities,
    },
    completed,
  };
}

/**
 * The signed-in experience: landing (goal input + saved plans) and the editor.
 * Everything here is scoped to `user` — the server only returns rows the
 * session's user owns.
 */
export default function Workspace({ user, settings, onSetSettings }: Props) {
  const dispatch = useAppDispatch();
  const providers = useAppSelector((s) => s.auth.providers);
  const projects = useAppSelector((s) => s.projects);

  const [tweaksVisible, setTweaksVisible] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [blueprint, setBlueprint] = useState<ProjectBlueprint | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeEpicId, setActiveEpicId] = useState<string | null>(null);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("overview");
  // Task completion is stored per task on the server; kept as a Set for O(1) lookups in the UI.
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  /** Serialised payload last known to be on the server; autosave skips when unchanged. */
  const lastSavedRef = useRef<string | null>(null);

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch, user.id]);

  // ---- Persistence --------------------------------------------------------

  useEffect(() => {
    if (!blueprint || !projects.currentId) return;
    const payload = toStored(blueprint, completedTaskIds);
    const serialised = JSON.stringify(payload);
    if (serialised === lastSavedRef.current) return;

    const id = projects.currentId;
    const timer = setTimeout(() => {
      lastSavedRef.current = serialised;
      dispatch(updateProject({ id, blueprint: payload }));
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [blueprint, completedTaskIds, projects.currentId, dispatch]);

  const openBlueprint = useCallback((next: ProjectBlueprint, completed: Set<string>) => {
    setBlueprint(next);
    setCompletedTaskIds(completed);
    setWorkspaceView("overview");
    setExpandedStoryId(null);
    setActiveEpicId(next.epics[0]?.epicId ?? null);
    setError(null);
  }, []);

  const resetToLanding = useCallback(() => {
    setBlueprint(null);
    setGoalInput("");
    setActiveEpicId(null);
    setExpandedStoryId(null);
    setCompletedTaskIds(new Set());
    setWorkspaceView("overview");
    lastSavedRef.current = null;
    dispatch(setCurrentProject(null));
  }, [dispatch]);

  const handleSessionLoss = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      dispatch(bootstrapSession());
      return true;
    }
    return false;
  };

  const generateBlueprint = async () => {
    if (!goalInput.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      const { projectBlueprint } = await generateApi.blueprint(goalInput);
      openBlueprint(projectBlueprint, new Set());

      const stored = toStored(projectBlueprint, new Set());
      lastSavedRef.current = JSON.stringify(stored);
      await dispatch(saveNewProject(stored)).unwrap();
    } catch (err: unknown) {
      if (handleSessionLoss(err)) return;
      // The save error (if any) is surfaced via the footer; only report generation failures here.
      if (!blueprint) {
        setError(err instanceof ApiError ? err.message : "Failed to generate blueprint. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const openProject = async (id: string) => {
    setOpeningId(id);
    try {
      const saved = await dispatch(loadProject(id)).unwrap();
      const { blueprint: next, completed } = fromSaved(saved);
      lastSavedRef.current = JSON.stringify(toStored(next, completed));
      openBlueprint(next, completed);
    } catch (err) {
      handleSessionLoss(err);
    } finally {
      setOpeningId(null);
    }
  };

  // ---- Mutators (all operate on flat arrays keyed by *Id) -----------------

  const updateEpic = (epicId: string, updates: Partial<Epic>) => {
    setBlueprint((prev) =>
      prev
        ? { ...prev, epics: prev.epics.map((ep) => (ep.epicId === epicId ? { ...ep, ...updates } : ep)) }
        : null,
    );
  };

  const updateStory = (storyId: string, updates: Partial<UserStory>) => {
    setBlueprint((prev) =>
      prev
        ? { ...prev, userStories: prev.userStories.map((s) => (s.storyId === storyId ? { ...s, ...updates } : s)) }
        : null,
    );
  };

  const toggleTask = (taskId: string) => {
    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const addEpic = () => {
    const newEpic: Epic = {
      epicId: crypto.randomUUID(),
      title: "New Epic",
      description: "Describe the high-level objective of this domain…",
      priority: "Medium",
    };
    setBlueprint((prev) => (prev ? { ...prev, epics: [...prev.epics, newEpic] } : null));
    setActiveEpicId(newEpic.epicId);
    setWorkspaceView("backlog");
  };

  const addStory = (epicId: string) => {
    const newStory: UserStory = {
      storyId: crypto.randomUUID(),
      epicId,
      title: "New User Story",
      asA: "user",
      iWant: "to do something",
      soThat: "I get value",
      priority: "Medium",
      acceptanceCriteria: ["Define the first acceptance criterion"],
    };
    setBlueprint((prev) => (prev ? { ...prev, userStories: [newStory, ...prev.userStories] } : null));
    setExpandedStoryId(newStory.storyId);
  };

  const deleteEpic = (epicId: string) => {
    setBlueprint((prev) => {
      if (!prev) return null;
      const remainingEpics = prev.epics.filter((e) => e.epicId !== epicId);
      const remainingStoryIds = new Set(prev.userStories.filter((s) => s.epicId !== epicId).map((s) => s.storyId));
      if (activeEpicId === epicId) setActiveEpicId(remainingEpics[0]?.epicId ?? null);
      return {
        ...prev,
        epics: remainingEpics,
        userStories: prev.userStories.filter((s) => s.epicId !== epicId),
        gherkinScenarios: prev.gherkinScenarios.filter((g) => remainingStoryIds.has(g.storyId)),
        tasks: prev.tasks.filter((t) => remainingStoryIds.has(t.storyId)),
      };
    });
  };

  const deleteStory = (storyId: string) => {
    setBlueprint((prev) =>
      prev
        ? {
            ...prev,
            userStories: prev.userStories.filter((s) => s.storyId !== storyId),
            gherkinScenarios: prev.gherkinScenarios.filter((g) => g.storyId !== storyId),
            tasks: prev.tasks.filter((t) => t.storyId !== storyId),
          }
        : null,
    );
  };

  const reorderStories = (epicId: string, reordered: UserStory[]) => {
    setBlueprint((prev) => {
      if (!prev) return null;
      const others = prev.userStories.filter((s) => s.epicId !== epicId);
      return { ...prev, userStories: [...reordered, ...others] };
    });
  };

  const activeEpic = useMemo(
    () => blueprint?.epics.find((e) => e.epicId === activeEpicId) ?? null,
    [blueprint, activeEpicId],
  );

  const activeStories = useMemo<UserStory[]>(
    () => (blueprint && activeEpicId ? blueprint.userStories.filter((s) => s.epicId === activeEpicId) : []),
    [blueprint, activeEpicId],
  );

  const linkProvider = (provider: OAuthProviderName) => authApi.startOAuth(provider);

  return (
    <>
      <Header
        blueprint={blueprint}
        workspaceView={workspaceView}
        onWorkspaceView={(view) => {
          setWorkspaceView(view);
          if (view === "backlog" && !activeEpicId && blueprint?.epics[0]) {
            setActiveEpicId(blueprint.epics[0].epicId);
          }
        }}
        onClear={resetToLanding}
        accountMenu={
          <UserMenu
            user={user}
            providers={providers}
            onSignOut={() => dispatch(signOut())}
            onLinkProvider={linkProvider}
          />
        }
      />

      <main className="flex-1 min-h-0 overflow-hidden relative z-10">
        <AnimatePresence mode="wait">
          {!blueprint ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto custom-scrollbar"
            >
              <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-20">
                <GoalInput
                  goalInput={goalInput}
                  isGenerating={isGenerating}
                  error={error}
                  onChange={setGoalInput}
                  onGenerate={generateBlueprint}
                />
                <ProjectList
                  projects={projects.items}
                  status={projects.listStatus}
                  error={projects.listError}
                  openingId={openingId}
                  onOpen={openProject}
                  onDelete={(id) => dispatch(removeProject(id))}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="blueprint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col md:flex-row h-full min-h-0 md:pl-4 md:pr-2 md:py-4 gap-4"
            >
              <EpicSidebar
                blueprint={blueprint}
                workspaceView={workspaceView}
                activeEpicId={activeEpicId}
                completedTaskIds={completedTaskIds}
                onSelectOverview={() => setWorkspaceView("overview")}
                onSelectEpic={(id) => {
                  setActiveEpicId(id);
                  setWorkspaceView("backlog");
                }}
                onDeleteEpic={deleteEpic}
                onAddEpic={addEpic}
              />

              <section className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden rounded-2xl border border-rule-soft bg-paper/80">
                {workspaceView === "overview" ? (
                  <OverviewPanel
                    blueprint={blueprint}
                    onOpenEpic={(id) => {
                      setActiveEpicId(id);
                      setWorkspaceView("backlog");
                    }}
                  />
                ) : activeEpic ? (
                  <EpicCanvas
                    activeEpic={activeEpic}
                    epicIndex={blueprint.epics.findIndex((e) => e.epicId === activeEpic.epicId)}
                    stories={activeStories}
                    gherkinScenarios={blueprint.gherkinScenarios}
                    tasks={blueprint.tasks}
                    completedTaskIds={completedTaskIds}
                    expandedStoryId={expandedStoryId}
                    onSetExpandedStory={setExpandedStoryId}
                    onUpdateEpicField={(field: keyof Epic, value: Epic[keyof Epic]) =>
                      updateEpic(activeEpic.epicId, { [field]: value } as Partial<Epic>)
                    }
                    onAddStory={() => addStory(activeEpic.epicId)}
                    onReorderStories={(stories: UserStory[]) => reorderStories(activeEpic.epicId, stories)}
                    onUpdateStory={(storyId: string, updates: Partial<UserStory>) => updateStory(storyId, updates)}
                    onDeleteStory={deleteStory}
                    onToggleTask={toggleTask}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center font-serif italic text-ink-3 text-lg">
                    Select an epic to open the backlog
                  </div>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>{isGenerating && <DraftingOverlay key="drafting" brief={goalInput} />}</AnimatePresence>

      <Tweaks
        visible={tweaksVisible}
        settings={settings}
        onSet={onSetSettings}
        onClose={() => setTweaksVisible(false)}
      />

      <Footer
        isGenerating={isGenerating}
        saveState={blueprint ? projects.saveState : "idle"}
        saveError={projects.saveError}
        onToggleTweaks={() => setTweaksVisible((v) => !v)}
      />
    </>
  );
}
