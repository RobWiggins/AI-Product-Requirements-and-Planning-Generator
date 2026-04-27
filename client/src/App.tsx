import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ProjectBlueprint, Epic, UserStory, Task } from "./lib/ai";
import {
  EpicCanvas,
  EpicSidebar,
  Footer,
  GoalInput,
  Header,
  StoryCard,
  Tweaks,
  TweakSettings
} from "./components";
import { ClaudeResponseSchema } from "./lib/ai";
import assert from "assert";

// import { z } from "zod";
// import { Header } from "./components/Header";
// import Footer from "./components/Footer"; 
// import { GoalInput } from "./components/GoalInput";
// import { EpicSidebar } from "./components/EpicSidebar";
// import { EpicCanvas } from "./components/EpicCanvas";
// import { Tweaks, TweakSettings } from "./components/Tweaks";


// import { Header } from "./components/Header";
// import Footer from "./components/Footer"; 
// import { GoalInput } from "./components/GoalInput";
// import { EpicSidebar } from "./components/EpicSidebar";
// import { EpicCanvas } from "./components/EpicCanvas";
// import { Tweaks, TweakSettings } from "./components/Tweaks";

const TWEAK_DEFAULTS: TweakSettings = {
  accentHue: 38,
  serif: "newsreader",
};

const SERIF_MAP: Record<TweakSettings["serif"], string> = {
  newsreader: `"Newsreader", "Source Serif 4", Georgia, serif`,
  source: `"Source Serif 4", "Newsreader", Georgia, serif`,
  system: `Georgia, "Times New Roman", serif`,
};

export default function App() {
  const [settings, setSettings] = useState<TweakSettings>(TWEAK_DEFAULTS);
  const [tweaksVisible, setTweaksVisible] = useState(false);

  const [goalInput, setGoalInput] = useState("");
  const [blueprint, setBlueprint] = useState<ProjectBlueprint | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeEpicId, setActiveEpicId] = useState<string | null>(null);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  // Tasks have no `status` in the schema — track completion locally for the UI
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const root = document.documentElement;
    const h = settings.accentHue;
    root.style.setProperty("--color-accent", `oklch(0.56 0.14 ${h})`);
    root.style.setProperty("--color-accent-ink", `oklch(0.35 0.1 ${h})`);
    root.style.setProperty("--color-accent-wash", `oklch(0.93 0.04 ${h})`);
    root.style.setProperty("--font-serif", SERIF_MAP[settings.serif]);
  }, [settings.accentHue, settings.serif]);

  const generateBlueprint = async () => {
    if (!goalInput.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      const headers = new Headers({
        "Content-Type": "application/json",
        "dangerouslyAllowBrowser": "true",
        // "apiKey": `${process.env.ANTHROPIC_API_KEY}`,
        // "authToken": `${process.env.CLAUDE_CODE_OAUTH_TOKEN}`,
      });

      const url = `http://localhost:3001/api/search?description=${encodeURIComponent(goalInput)}`;
      const response = await fetch(url, { method: "GET", ...headers });

      

      console.log("Raw response ---", response);

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      console.log('response---', response);

      const responseJson = await response.json()

      console.log('responseJson---', responseJson);

      const claudeResponse = ClaudeResponseSchema.safeParse(responseJson);
      console.log('claudeResponse --- ', claudeResponse);

      if (!responseJson.ok) {
        throw new Error("Failed to parse Claude response");
      }
      // const blueprint = claudeResponse.content.text.ProjectBlueprint;
      // assert(claudeResponse.content[0].text)
      // const blueprint: ProjectBlueprint = JSON.parse(claudeResponse.content[0].text || "[]")
    
      console.log('claudeResponse - ', claudeResponse);

      const projectBlueprint = claudeResponse.content[0].text.ProjectBlueprint;
      setBlueprint(projectBlueprint);
      setCompletedTaskIds(new Set());
      if (projectBlueprint.epics.length > 0) setActiveEpicId(projectBlueprint.epics[0].epicId);
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to generate blueprint. Please verify your API key and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ---- Mutators (all operate on flat arrays keyed by *Id) -----------------

  const updateEpic = (epicId: string, updates: Partial<Epic>) => {
    setBlueprint((prev) =>
      prev
        ? {
            ...prev,
            epics: prev.epics.map((ep) => (ep.epicId === epicId ? { ...ep, ...updates } : ep)),
          }
        : null
    );
  };

  const updateStory = (storyId: string, updates: Partial<UserStory>) => {
    setBlueprint((prev) =>
      prev
        ? {
            ...prev,
            userStories: prev.userStories.map((s) =>
              s.storyId === storyId ? { ...s, ...updates } : s
            ),
          }
        : null
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
    setBlueprint((prev) =>
      prev ? { ...prev, userStories: [newStory, ...prev.userStories] } : null
    );
    setExpandedStoryId(newStory.storyId);
  };

  const deleteEpic = (epicId: string) => {
    setBlueprint((prev) => {
      if (!prev) return null;
      const remainingEpics = prev.epics.filter((e) => e.epicId !== epicId);
      const remainingStoryIds = new Set(
        prev.userStories.filter((s) => s.epicId !== epicId).map((s) => s.storyId)
      );
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
        : null
    );
  };

  const reorderStories = (epicId: string, reordered: UserStory[]) => {
    setBlueprint((prev) => {
      if (!prev) return null;
      // Replace this epic's stories with the reordered list, keep others stable
      const others = prev.userStories.filter((s) => s.epicId !== epicId);
      return { ...prev, userStories: [...reordered, ...others] };
    });
  };

  const activeEpic = useMemo(
    () => blueprint?.epics.find((e) => e.epicId === activeEpicId) ?? null,
    [blueprint, activeEpicId]
  );

  const activeStories = useMemo<UserStory[]>(
    () => (blueprint && activeEpicId ? blueprint.userStories.filter((s) => s.epicId === activeEpicId) : []),
    [blueprint, activeEpicId]
  );

  return (
    <div className="relative flex flex-col h-screen bg-paper text-ink font-body selection:bg-accent-wash">
      {/* Soft, vibrant paper wash that follows the accent hue */}
      <div
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(1200px 600px at 10% -10%, oklch(0.93 0.05 ${settings.accentHue} / 0.55), transparent 60%),
            radial-gradient(900px 500px at 110% 5%, oklch(0.94 0.04 150 / 0.4), transparent 60%),
            radial-gradient(700px 600px at 50% 110%, oklch(0.95 0.03 235 / 0.35), transparent 60%)
          `,
        }}
      />

      <Header
        blueprint={blueprint}
        onClear={() => {
          setBlueprint(null);
          setGoalInput("");
          setActiveEpicId(null);
          setExpandedStoryId(null);
          setCompletedTaskIds(new Set());
        }}
      />

      <main className="flex-1 min-h-0 overflow-hidden relative z-10">
        <div className="h-full max-w-6xl mx-auto px-8">
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
                <div className="pt-10 pb-16">
                  <GoalInput
                    goalInput={goalInput}
                    isGenerating={isGenerating}
                    error={error}
                    onChange={setGoalInput}
                    onGenerate={generateBlueprint}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="blueprint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="flex gap-8 h-full pt-6 pb-4"
              >
                <EpicSidebar
                  blueprint={blueprint}
                  activeEpicId={activeEpicId}
                  onSelectEpic={setActiveEpicId}
                  onDeleteEpic={deleteEpic}
                  onAddEpic={addEpic}
                />

                <section className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    {activeEpic ? (
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
                      Select an epic from the margin to begin…
                    </div>
                    )}
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Tweaks
        visible={tweaksVisible}
        settings={settings}
        onSet={(patch: Partial<TweakSettings>) =>
          setSettings((s: TweakSettings) => ({ ...s, ...patch }))
        }
        onClose={() => setTweaksVisible(false)}
      />

      <Footer
        isGenerating={isGenerating}
        onToggleTweaks={() => setTweaksVisible((v) => !v)}
      />
    </div>
  );
}

// re-export so unused-warnings stay clean if anyone reaches in
export type { Task };

// export App
