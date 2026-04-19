import { Plus } from "lucide-react";
import { Reorder } from "motion/react";
import { Epic, UserStory } from "../types";
import { StoryCard } from "./StoryCard";

interface Props {
  activeEpic: Epic;
  expandedStoryId: string | null;
  onSetExpandedStory: (id: string | null) => void;
  onUpdateEpicField: (field: "title" | "description", value: string) => void;
  onAddStory: () => void;
  onReorderStories: (stories: UserStory[]) => void;
  onUpdateStory: (storyId: string, updates: Partial<UserStory>) => void;
  onDeleteStory: (storyId: string) => void;
  onToggleTask: (storyId: string, taskId: string) => void;
}

export function EpicCanvas({
  activeEpic,
  expandedStoryId,
  onSetExpandedStory,
  onUpdateEpicField,
  onAddStory,
  onReorderStories,
  onUpdateStory,
  onDeleteStory,
  onToggleTask,
}: Props) {
  return (
    <div className="flex flex-col h-full gap-6">
      <div className="animate-in fade-in slide-in-from-left duration-500 shrink-0 flex items-start justify-between bg-white p-6 rounded-xl border border-border-main shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-accent-light text-accent text-[11px] font-bold px-2 py-0.5 rounded border border-accent/10">
              EPIC {activeEpic.order}
            </span>
            <h2
              className="text-2xl font-bold text-gray-900 tracking-tight outline-none"
              contentEditable
              onBlur={(e) => onUpdateEpicField("title", e.currentTarget.innerText)}
            >
              {activeEpic.title}
            </h2>
          </div>
          <p
            className="text-gray-500 text-sm max-w-2xl outline-none"
            contentEditable
            onBlur={(e) => onUpdateEpicField("description", e.currentTarget.innerText)}
          >
            {activeEpic.description}
          </p>
        </div>
        <button
          onClick={onAddStory}
          className="bg-accent hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          ADD STORY
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        <Reorder.Group
          axis="y"
          values={activeEpic.stories}
          onReorder={onReorderStories}
          className="space-y-3"
        >
          {activeEpic.stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              isExpanded={expandedStoryId === story.id}
              onToggleExpand={() =>
                onSetExpandedStory(expandedStoryId === story.id ? null : story.id)
              }
              onUpdate={(updates) => onUpdateStory(story.id, updates)}
              onDelete={() => onDeleteStory(story.id)}
              onToggleTask={(taskId) => onToggleTask(story.id, taskId)}
            />
          ))}
        </Reorder.Group>
      </div>
    </div>
  );
}
