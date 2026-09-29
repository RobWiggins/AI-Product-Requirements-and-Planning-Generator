import { Pencil, Plus } from "lucide-react";
import { Reorder } from "motion/react";
import { Epic, UserStory } from "../lib/ai";
import { StoryCard } from "./StoryCard";
import EditableText from "./EditableText";
import PriorityChip from "./PriorityChip";
import { colorForEpic } from "../lib/palette";
import { newId } from "../lib/ids";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  epicUpdated,
  selectEpicIndex,
  selectStoriesForEpic,
  storiesReordered,
  storyAdded,
} from "../store/slices/blueprintSlice";

interface Props {
  activeEpic: Epic;
  expandedStoryId: string | null;
  onSetExpandedStory: (id: string | null) => void;
}

export function newStory(epicId: string): UserStory {
  return {
    storyId: newId(),
    epicId,
    title: "New User Story",
    asA: "user",
    iWant: "to do something",
    soThat: "I get value",
    priority: "Medium",
    acceptanceCriteria: ["Define the first acceptance criterion"],
  };
}

export function EpicCanvas({ activeEpic, expandedStoryId, onSetExpandedStory }: Props) {
  const dispatch = useAppDispatch();
  const epicIndex = useAppSelector((s) => selectEpicIndex(s, activeEpic.epicId));
  const stories = useAppSelector((s) => selectStoriesForEpic(s, activeEpic.epicId));
  const c = colorForEpic(Math.max(0, epicIndex));

  const update = (changes: Partial<Epic>) => dispatch(epicUpdated({ id: activeEpic.epicId, changes }));

  const onAddStory = () => {
    const story = newStory(activeEpic.epicId);
    dispatch(storyAdded(story));
    onSetExpandedStory(story.storyId);
  };

  const onReorderStories = (reordered: UserStory[]) =>
    dispatch(storiesReordered({ epicId: activeEpic.epicId, orderedIds: reordered.map((s) => s.storyId) }));

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
          <PriorityChip
            value={activeEpic.priority}
            suffix="priority"
            onChange={(priority) => update({ priority })}
            className="tracking-[0.14em]"
          />
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

        <EditableText
          as="h2"
          value={activeEpic.title}
          required
          onCommit={(title) => update({ title })}
          aria-label="Epic title"
          className="font-serif text-[clamp(26px,3vw,36px)] font-medium tracking-[-0.015em] leading-[1.15] text-ink mb-2"
        />

        <EditableText
          as="p"
          value={activeEpic.description}
          multiline
          onCommit={(description) => update({ description })}
          placeholder="Describe the high-level objective of this epic…"
          aria-label="Epic description"
          className="font-ui text-[16px] leading-[1.6] text-ink-2 max-w-3xl"
        />

        <p className="mt-3 mb-0 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          <Pencil className="w-3 h-3" />
          Click any text to edit · changes save automatically
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
                isExpanded={expandedStoryId === story.storyId}
                onToggleExpand={() =>
                  onSetExpandedStory(expandedStoryId === story.storyId ? null : story.storyId)
                }
              />
            ))}
          </Reorder.Group>
        )}
      </div>
    </div>
  );
}

export default EpicCanvas;
