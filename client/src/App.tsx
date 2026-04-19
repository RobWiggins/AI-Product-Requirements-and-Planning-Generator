import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ProjectBlueprint, Epic, UserStory } from "./types";
import { ai, GENERATION_SCHEMA, SYSTEM_INSTRUCTION } from "./lib/ai";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { GoalInput } from "./components/GoalInput";
import { EpicSidebar } from "./components/EpicSidebar";
import { EpicCanvas } from "./components/EpicCanvas";

export default function App() {
  const [goalInput, setGoalInput] = useState("");
  const [blueprint, setBlueprint] = useState<ProjectBlueprint | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeEpicId, setActiveEpicId] = useState<string | null>(null);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);

  const generateBlueprint = async () => {
    if (!goalInput.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Project Goal: ${goalInput}\n\nGenerate a full backlog of requirements including epics, stories, ACs, tasks, and Gherkin.`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: GENERATION_SCHEMA,
        },
      });
      const text = result.text;
      if (!text) throw new Error("No response from AI");
      const data = JSON.parse(text) as ProjectBlueprint;
      setBlueprint(data);
      if (data.epics.length > 0) setActiveEpicId(data.epics[0].id);
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to generate blueprint. Please verify your Gemini API key and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

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
    <div className="min-h-screen bg-bg-main text-gray-900 font-sans selection:bg-accent/20">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />

      <Header
        blueprint={blueprint}
        onClear={() => { setBlueprint(null); setGoalInput(""); }}
      />

      <main className="relative z-10 max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {!blueprint ? (
            <GoalInput
              goalInput={goalInput}
              isGenerating={isGenerating}
              error={error}
              onChange={setGoalInput}
              onGenerate={generateBlueprint}
            />
          ) : (
            <motion.div
              key="blueprint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-8 h-[calc(100vh-140px)]"
            >
              <EpicSidebar
                epics={blueprint.epics}
                activeEpicId={activeEpicId}
                blueprint={blueprint}
                onSelectEpic={setActiveEpicId}
                onDeleteEpic={deleteEpic}
                onAddEpic={addEpic}
              />

              <section className="flex-1 flex flex-col gap-6 overflow-hidden">
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
                  <div className="flex-1 flex items-center justify-center text-gray-700 font-mono italic">
                    Select an architecture domain to begin...
                  </div>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer isGenerating={isGenerating} />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1F1F1F; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #2A2A2A; }
      `}</style>
    </div>
  );
}
