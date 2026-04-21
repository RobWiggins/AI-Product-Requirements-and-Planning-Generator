import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ProjectBlueprint, Epic, UserStory } from "./types";
import { ai, GENERATION_SCHEMA, SYSTEM_INSTRUCTION } from "./lib/ai";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { GoalInput } from "./components/GoalInput";
import { EpicSidebar } from "./components/EpicSidebar";
import { EpicCanvas } from "./components/EpicCanvas";
import { Tweaks, TweakSettings } from "./components/Tweaks";
import { emitWarning } from "process";

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
    // try {
    //   const result = await ai.models.generateContent({
    //     model: "gemini-3-flash-preview",
    //     contents: `Project Goal: ${goalInput}\n\nGenerate a full backlog of requirements including epics, stories, ACs, tasks, and Gherkin.`,
    //     config: {
    //       systemInstruction: SYSTEM_INSTRUCTION,
    //       responseMimeType: "application/json",
    //       responseSchema: GENERATION_SCHEMA,
    //     },
    //   });
    //   const text = result.text;
    //   if (!text) throw new Error("No response from AI");
    //   const data = JSON.parse(text) as ProjectBlueprint;
    //   setBlueprint(data);
    //   if (data.epics.length > 0) setActiveEpicId(data.epics[0].id);
    // } catch (err: unknown) {
    //   console.error(err);
    //   setError("Failed to generate blueprint. Please verify your Gemini API key and try again.");
    // } finally {
    //   setIsGenerating(false);
    // }
    // http://localhost:3000/api/search?description=A%20plant-care%20companion%20that%20uses%20your%20phone%20camera%20to%20diagnose%20sick%20houseplants.


    // ! Fix hardcode
    try {

      const headers = new Headers([["Content-Type", "application/json"], ['apiKey', `${process.env.ANTHROPIC_API_KEY}`], ['authToken', `${process.env.CLAUDE_CODE_OAUTH_TOKEN}` ]]);

      // const headers = new Headers({ "Content-Type": "application/json", "Authorization": `Bearer ${process.env.ANTHROPIC_API_KEY}`});
      // method: 'GET',
        // headers: {
        // 'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
        // // 'X-Custom-Header': 'CustomValue'
        // }}
        // headers}
      const request = new Request(`http://localhost:3001/api/search?description=${encodeURIComponent(goalInput)}`, {
        method: 'GET',
        headers,
      });
      console.log('request- ', request);


      const response = await fetch(`http://localhost:3001/api/search?description=${encodeURIComponent(goalInput)}`, request);

      console.log('response- ', response);    
    
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
    }
    const data = await response.json();
    console.log("Raw AI response:", data);
    setBlueprint(data);
    if (data.epics.length > 0) setActiveEpicId(data.epics[0].id);
  } catch (err: unknown) {
    console.error(err);
    setError("Failed to generate blueprint. Please verify your API key and try again.");
  } finally {
    setIsGenerating(false);
  }
}

const updateEpic = (epicId: string, updates: Partial<Epic>) => {
  setBlueprint((prev) =>
    prev
      ? { ...prev, epics: prev.epics.map((ep) => (ep.id === epicId ? { ...ep, ...updates } : ep)) }
      : null
  );
};

const updateStory = (epicId: string, storyId: string, updates: Partial<UserStory>) => {
  setBlueprint((prev) => {
    if (!prev) return null;
    return {
      ...prev,
      epics: prev.epics.map((epic) =>
        epic.id !== epicId
          ? epic
          : { ...epic, stories: epic.stories.map((s) => (s.id === storyId ? { ...s, ...updates } : s)) }
      ),
    };
  });
};

const toggleTask = (epicId: string, storyId: string, taskId: string) => {
  setBlueprint((prev) => {
    if (!prev) return null;
    return {
      ...prev,
      epics: prev.epics.map((epic) =>
        epic.id !== epicId
          ? epic
          : {
            ...epic,
            stories: epic.stories.map((story) =>
              story.id !== storyId
                ? story
                : {
                  ...story,
                  tasks: story.tasks.map((t) =>
                    t.id === taskId ? { ...t, status: t.status === "todo" ? "done" : "todo" } : t
                  ),
                }
            ),
          }
      ),
    };
  });
};

const addEpic = () => {
  const newEpic: Epic = {
    id: crypto.randomUUID(),
    title: "New Epic",
    description: "Describe the high-level objective of this domain...",
    order: (blueprint?.epics.length || 0) + 1,
    stories: [],
  };
  setBlueprint((prev) => (prev ? { ...prev, epics: [...prev.epics, newEpic] } : null));
  setActiveEpicId(newEpic.id);
};

const addStory = (epicId: string) => {
  const newStory: UserStory = {
    id: crypto.randomUUID(),
    title: "New User Story",
    description: "As a... I want... So that...",
    acceptanceCriteria: ["Requirement 1"],
    gherkin: "Feature: New Feature\n  Scenario: New Scenario\n    Given ...\n    When ...\n    Then ...",
    tasks: [{ id: crypto.randomUUID(), title: "Initial setup", status: "todo" }],
    priority: "medium",
    order: 1,
  };
  setBlueprint((prev) =>
    prev
      ? { ...prev, epics: prev.epics.map((e) => (e.id === epicId ? { ...e, stories: [newStory, ...e.stories] } : e)) }
      : null
  );
  setExpandedStoryId(newStory.id);
};

const deleteEpic = (epicId: string) => {
  setBlueprint((prev) => {
    if (!prev) return null;
    const filtered = prev.epics.filter((e) => e.id !== epicId);
    if (activeEpicId === epicId) setActiveEpicId(filtered[0]?.id || null);
    return { ...prev, epics: filtered };
  });
};

const deleteStory = (epicId: string, storyId: string) => {
  setBlueprint((prev) =>
    prev
      ? { ...prev, epics: prev.epics.map((e) => (e.id === epicId ? { ...e, stories: e.stories.filter((s) => s.id !== storyId) } : e)) }
      : null
  );
};

const reorderStories = (epicId: string, stories: UserStory[]) => {
  setBlueprint((prev) =>
    prev ? { ...prev, epics: prev.epics.map((e) => (e.id === epicId ? { ...e, stories } : e)) } : null
  );
};

const activeEpic = useMemo(() => blueprint?.epics.find((e) => e.id === activeEpicId), [blueprint, activeEpicId]);

return (
  <div className="relative flex flex-col h-screen bg-paper text-ink font-body selection:bg-accent-wash">
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        background: `radial-gradient(1200px 600px at 10% -10%, oklch(0.93 0.03 ${settings.accentHue} / 0.45), transparent 60%), radial-gradient(1000px 500px at 110% 10%, oklch(0.95 0.02 100 / 0.4), transparent 60%)`,
      }}
    />

    <Header
      blueprint={blueprint}
      onClear={() => { setBlueprint(null); setGoalInput(""); }}
    />

    {/* flex-1 min-h-0 lets this region fill remaining height without overflow */}
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
              className="flex gap-10 h-full pt-6 pb-4"
            >
              <EpicSidebar
                epics={blueprint.epics}
                activeEpicId={activeEpicId}
                blueprint={blueprint}
                onSelectEpic={setActiveEpicId}
                onDeleteEpic={deleteEpic}
                onAddEpic={addEpic}
              />

              <section className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {activeEpic ? (
                  <EpicCanvas
                    activeEpic={activeEpic}
                    expandedStoryId={expandedStoryId}
                    onSetExpandedStory={setExpandedStoryId}
                    onUpdateEpicField={(field, value) => updateEpic(activeEpic.id, { [field]: value })}
                    onAddStory={() => addStory(activeEpic.id)}
                    onReorderStories={(stories) => reorderStories(activeEpic.id, stories)}
                    onUpdateStory={(storyId, updates) => updateStory(activeEpic.id, storyId, updates)}
                    onDeleteStory={(storyId) => deleteStory(activeEpic.id, storyId)}
                    onToggleTask={(storyId, taskId) => toggleTask(activeEpic.id, storyId, taskId)}
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
      onSet={(patch) => setSettings((s) => ({ ...s, ...patch }))}
      onClose={() => setTweaksVisible(false)}
    />

    <Footer
      isGenerating={isGenerating}
      onToggleTweaks={() => setTweaksVisible((v) => !v)}
    />
  </div>
);
}
