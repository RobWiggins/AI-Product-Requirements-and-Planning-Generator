import { Plus } from "lucide-react";
import { Reorder } from "motion/react";
import { Epic, GherkinScenario, Task, UserStory } from "../lib/ai";
import { StoryCard } from "./StoryCard";
import { colorForEpic, PRIORITY_CHIP } from "../lib/palette";

interface Props {
  activeEpic: Epic;
  epicIndex: number;
  stories: UserStory[];
  gherkinScenarios: GherkinScenario[];
  tasks: Task[];
  completedTaskIds: Set<string>;
  expandedStoryId: string | null;
  onSetExpandedStory: (id: string | null) => void;
  onUpdateEpicField: (field: "title" | "description", value: string) => void;
  onAddStory: () => void;
  onReorderStories: (stories: UserStory[]) => void;
  onUpdateStory: (storyId: string, updates: Partial<UserStory>) => void;
  onDeleteStory: (storyId: string) => void;
  onToggleTask: (taskId: string) => void;
}

export function EpicCanvas({
  activeEpic,
  epicIndex,
  stories,
  gherkinScenarios,
  tasks,
  completedTaskIds,
  expandedStoryId,
  onSetExpandedStory,
  onUpdateEpicField,
  onAddStory,
  onReorderStories,
  onUpdateStory,
  onDeleteStory,
  onToggleTask,
}: Props) {
  const c = colorForEpic(epicIndex);

  return (
    <div className="flex flex-col h-full min-h-0 gap-6">
      {/* Editorial epic header — colored eyebrow + display serif */}
      <div className="shrink-0 animate-in fade-in slide-in-from-left duration-500">
        <div className="flex items-baseline gap-3.5 mb-4">
          <span
            className="font-mono text-[11px] uppercase tracking-[0.14em] inline-flex items-center gap-2"
            style={{ color: c.ink }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: c.fg }}
              aria-hidden
            />
            Epic {String(epicIndex + 1).padStart(2, "0")}
          </span>
          <span
            className={`font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-[3px] rounded-full ${
              PRIORITY_CHIP[activeEpic.priority]
            }`}
          >
            {activeEpic.priority} priority
          </span>
          <div className="flex-1 h-px bg-rule translate-y-[-6px]" />
          <button
            onClick={onAddStory}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-ink text-paper text-[12px] font-body hover:bg-accent-ink transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add story
          </button>
        </div>

        <h2
          className="font-serif text-[36px] font-medium tracking-[-0.015em] leading-[1.1] text-ink outline-none mb-3 focus:text-accent-ink transition-colors"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onUpdateEpicField("title", e.currentTarget.innerText)}
        >
          {activeEpic.title}
        </h2>

        <p
          className="font-body text-[17px] leading-[1.55] text-ink-2 max-w-3xl outline-none focus:text-ink transition-colors"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onUpdateEpicField("description", e.currentTarget.innerText)}
        >
          {activeEpic.description}
        </p>
      </div>

      {/* Story stack */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
        {stories.length === 0 ? (
          <div className="py-12 text-center rule-dashed border-b pb-12">
            <p className="font-serif italic text-[16px] text-ink-3 mb-4">
              No stories yet — the margin awaits a first thought.
            </p>
            <button
              onClick={onAddStory}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rule text-ink-2 hover:text-ink hover:border-accent/40 hover:bg-accent-wash/40 text-[13px] font-body transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Draft the first story
            </button>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={stories}
            onReorder={onReorderStories}
            className="flex flex-col"
          >
            {stories.map((story, idx) => (
              <StoryCard
                key={story.storyId}
                story={story}
                index={idx}
                accentClasses={c}
                gherkin={gherkinScenarios.find((g) => g.storyId === story.storyId) ?? null}
                tasks={tasks.filter((t) => t.storyId === story.storyId)}
                completedTaskIds={completedTaskIds}
                isExpanded={expandedStoryId === story.storyId}
                onToggleExpand={() =>
                  onSetExpandedStory(expandedStoryId === story.storyId ? null : story.storyId)
                }
                onUpdate={(updates) => onUpdateStory(story.storyId, updates)}
                onDelete={() => onDeleteStory(story.storyId)}
                onToggleTask={onToggleTask}
              />
            ))}
          </Reorder.Group>
        )}
      </div>
    </div>
  );
}

export default EpicCanvas;
