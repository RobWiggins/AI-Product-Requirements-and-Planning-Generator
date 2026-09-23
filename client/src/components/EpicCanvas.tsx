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
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-6 lg:px-10 pt-7 pb-5 border-b border-rule-soft bg-paper/70">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span
            className="font-mono text-[11px] uppercase tracking-[0.14em] inline-flex items-center gap-2"
            style={{ color: c.ink }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: c.fg }} aria-hidden />
            Epic {String(epicIndex + 1).padStart(2, "0")}
          </span>
          <span
            className={`font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-[3px] rounded-full ${
              PRIORITY_CHIP[activeEpic.priority]
            }`}
          >
            {activeEpic.priority} priority
          </span>
          <span className="font-mono text-[11px] text-ink-3">
            {stories.length} {stories.length === 1 ? "story" : "stories"}
          </span>
          <button
            type="button"
            onClick={onAddStory}
            className="ml-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-ink text-paper text-[13px] font-ui hover:bg-accent-ink transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add story
          </button>
        </div>

        <h2
          className="font-serif text-[clamp(26px,3vw,36px)] font-medium tracking-[-0.015em] leading-[1.15] text-ink outline-none mb-2 focus:text-accent-ink transition-colors"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onUpdateEpicField("title", e.currentTarget.innerText)}
        >
          {activeEpic.title}
        </h2>

        <p
          className="font-ui text-[16px] leading-[1.6] text-ink-2 max-w-3xl outline-none focus:text-ink transition-colors"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onUpdateEpicField("description", e.currentTarget.innerText)}
        >
          {activeEpic.description}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 lg:px-10 py-6">
        {stories.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-rule">
            <p className="font-serif italic text-[16px] text-ink-3 mb-4">
              No stories in this epic yet.
            </p>
            <button
              type="button"
              onClick={onAddStory}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rule text-ink-2 hover:text-ink hover:border-accent/40 hover:bg-accent-wash/40 text-[13px] font-ui transition-colors"
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
            className="flex flex-col gap-3"
          >
            {stories.map((story, idx) => (
              <StoryCard
                key={story.storyId}
                story={story}
                index={idx}
                accentClasses={c}
                gherkins={gherkinScenarios.filter((g) => g.storyId === story.storyId)}
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
