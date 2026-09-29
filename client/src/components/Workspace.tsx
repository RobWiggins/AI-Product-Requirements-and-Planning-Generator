import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ProjectBlueprint } from "../lib/ai";
import { ApiError, generateApi, type AuthUser, type OAuthProviderName, type StoredBlueprint, authApi } from "../lib/api";
import { useAppDispatch, useAppSelector } from "../hooks";
import { bootstrapSession, signOut } from "../store/slices/authSlice";
import {
  blueprintCleared,
  blueprintLoaded,
  selectAllEpics,
  selectEpicById,
  selectIsDirty,
  selectRevision,
  selectStoredBlueprint,
} from "../store/slices/blueprintSlice";
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

/** A freshly generated blueprint has no completed tasks yet. */
const toStored = (blueprint: ProjectBlueprint): StoredBlueprint => ({
  ...blueprint,
  tasks: blueprint.tasks.map((t) => ({ ...t, completed: false })),
});

/**
 * The signed-in experience: landing (goal input + saved plans) and the editor.
 *
 * The document itself lives in the `blueprint` slice; this component owns only
 * view state (which epic/story is open, which panel is showing) and the
 * load / save lifecycle. Everything is scoped to `user` — the server only
 * returns rows the session's user owns.
 */
export default function Workspace({ user, settings, onSetSettings }: Props) {
  const dispatch = useAppDispatch();
  const providers = useAppSelector((s) => s.auth.providers);
  const projects = useAppSelector((s) => s.projects);
  const stored = useAppSelector(selectStoredBlueprint);
  const epics = useAppSelector(selectAllEpics);
  const revision = useAppSelector(selectRevision);
  const dirty = useAppSelector(selectIsDirty);

  const [tweaksVisible, setTweaksVisible] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeEpicId, setActiveEpicId] = useState<string | null>(null);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("overview");

  const activeEpic = useAppSelector((s) => (activeEpicId ? selectEpicById(s, activeEpicId) : undefined)) ?? null;

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch, user.id]);

  // If the active epic was deleted, fall back to the first remaining one.
  useEffect(() => {
    if (activeEpicId && !epics.some((e) => e.epicId === activeEpicId)) {
      setActiveEpicId(epics[0]?.epicId ?? null);
    }
  }, [epics, activeEpicId]);

  // ---- Persistence --------------------------------------------------------

  useEffect(() => {
    if (!dirty || !stored || !projects.currentId) return;
    const id = projects.currentId;
    const timer = setTimeout(() => {
      dispatch(updateProject({ id, blueprint: stored, revision }));
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [dirty, revision, stored, projects.currentId, dispatch]);

  const resetView = useCallback((firstEpicId: string | null) => {
    setWorkspaceView("overview");
    setExpandedStoryId(null);
    setActiveEpicId(firstEpicId);
    setError(null);
  }, []);

  const resetToLanding = useCallback(() => {
    dispatch(blueprintCleared());
    dispatch(setCurrentProject(null));
    setGoalInput("");
    resetView(null);
  }, [dispatch, resetView]);

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

    let blueprint: ProjectBlueprint;
    try {
      blueprint = (await generateApi.blueprint(goalInput)).projectBlueprint;
    } catch (err: unknown) {
      setIsGenerating(false);
      if (handleSessionLoss(err)) return;
      setError(err instanceof ApiError ? err.message : "Failed to generate blueprint. Please try again.");
      return;
    }

    dispatch(blueprintLoaded(blueprint));
    resetView(blueprint.epics[0]?.epicId ?? null);
    setIsGenerating(false);

    // Save failures surface in the footer via projects.saveState; nothing to do here.
    await dispatch(saveNewProject({ blueprint: toStored(blueprint), revision: 0 }))
      .unwrap()
      .catch(handleSessionLoss);
  };

  const openProject = async (id: string) => {
    setOpeningId(id);
    try {
      const saved = await dispatch(loadProject(id)).unwrap();
      dispatch(blueprintLoaded(saved));
      resetView(saved.epics[0]?.epicId ?? null);
    } catch (err) {
      handleSessionLoss(err);
    } finally {
      setOpeningId(null);
    }
  };

  const linkProvider = (provider: OAuthProviderName) => authApi.startOAuth(provider);

  return (
    <>
      <Header
        blueprint={stored}
        workspaceView={workspaceView}
        onWorkspaceView={(view) => {
          setWorkspaceView(view);
          if (view === "backlog" && !activeEpicId && epics[0]) {
            setActiveEpicId(epics[0].epicId);
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
          {!stored ? (
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
                workspaceView={workspaceView}
                activeEpicId={activeEpicId}
                onSelectOverview={() => setWorkspaceView("overview")}
                onSelectEpic={(id) => {
                  setActiveEpicId(id);
                  setWorkspaceView("backlog");
                }}
              />

              <section className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden rounded-2xl border border-rule-soft bg-paper/80">
                {workspaceView === "overview" ? (
                  <OverviewPanel
                    onOpenEpic={(id) => {
                      setActiveEpicId(id);
                      setWorkspaceView("backlog");
                    }}
                  />
                ) : activeEpic ? (
                  <EpicCanvas
                    activeEpic={activeEpic}
                    expandedStoryId={expandedStoryId}
                    onSetExpandedStory={setExpandedStoryId}
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
        saveState={stored ? projects.saveState : "idle"}
        saveError={projects.saveError}
        onToggleTweaks={() => setTweaksVisible((v) => !v)}
      />
    </>
  );
}
