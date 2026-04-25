import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { ProjectBlueprint } from "../lib/ai";
import { colorForEpic } from "../lib/palette";

interface Props {
  blueprint: ProjectBlueprint;
  activeEpicId: string | null;
  onSelectEpic: (id: string) => void;
  onDeleteEpic: (id: string) => void;
  onAddEpic: () => void;
}

function projectCompletion(bp: ProjectBlueprint, completedTaskIds?: Set<string>): number {
  // Without a real task status, fall back to "stories drafted vs. epics".
  // A richer hook from App can pass in completedTaskIds later.
  const total = bp.tasks.length;
  if (!total) return 0;
  const done = completedTaskIds ? bp.tasks.filter((t) => completedTaskIds.has(t.taskId)).length : 0;
  return (done / total) * 100;
}

export function EpicSidebar({
  blueprint,
  activeEpicId,
  onSelectEpic,
  onDeleteEpic,
  onAddEpic,
}: Props) {
  const completion = projectCompletion(blueprint);
  const totalStories = blueprint.userStories.length;
  const totalTasks = blueprint.tasks.length;

  return (
    <aside className="w-72 shrink-0 flex flex-col gap-4">
      {/* Project title card */}
      <div className="bg-paper border border-rule-soft rounded-[14px] p-5 shadow-[0_2px_0_var(--color-rule-soft)]">
        <span className="eyebrow">Project</span>
        <h3 className="font-serif text-[20px] font-medium tracking-[-0.01em] text-ink mt-1.5 mb-1 leading-snug">
          {blueprint.projectName}
        </h3>
        <p className="font-serif text-[14px] italic text-ink-2 leading-snug line-clamp-2">
          {blueprint.description}
        </p>
        <div className="flex gap-3 mt-3 pt-3 border-t border-dashed border-rule">
          <Stat label="Epics" value={blueprint.epics.length} />
          <Stat label="Stories" value={totalStories} />
          <Stat label="Tasks" value={totalTasks} />
        </div>
      </div>

      {/* Epic list */}
      <div className="flex-1 flex flex-col min-h-0 bg-paper border border-rule-soft rounded-[14px] p-5 shadow-[0_2px_0_var(--color-rule-soft)]">
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <span className="eyebrow">Epics</span>
          <div className="flex-1 h-px bg-rule-soft" />
          <span className="font-mono text-[11px] text-ink-3">
            {blueprint.epics.length.toString().padStart(2, "0")}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2 mb-4">
          <ul className="flex flex-col">
            {blueprint.epics.map((epic, idx) => {
              const active = activeEpicId === epic.epicId;
              const c = colorForEpic(idx);
              const storyCount = blueprint.userStories.filter(
                (s) => s.epicId === epic.epicId
              ).length;
              return (
                <li key={epic.epicId} className="relative group/epic">
                  <button
                    onClick={() => onSelectEpic(epic.epicId)}
                    className={`w-full text-left grid grid-cols-[auto_1fr_auto] items-baseline gap-3 py-3 pl-3 pr-8 border-t border-rule-soft first:border-t-0 transition-colors ${
                      active ? "text-ink" : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full self-center shrink-0"
                      style={{ background: c.fg }}
                      aria-hidden
                    />
                    <span
                      className={`font-serif text-[16px] leading-snug truncate ${
                        active ? "font-medium" : ""
                      }`}
                    >
                      {epic.title}
                    </span>
                    <span className="font-mono text-[10px] text-ink-3 self-center">
                      {storyCount.toString().padStart(2, "0")}
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 self-center col-start-3 row-start-1 -mr-6 transition-all ${
                        active
                          ? "opacity-100"
                          : "opacity-0 group-hover/epic:opacity-100"
                      }`}
                      style={{ color: c.fg }}
                    />
                  </button>

                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-full"
                      style={{ background: c.fg }}
                    />
                  )}

                  {!active && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEpic(epic.epicId);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-ink-3 hover:text-accent-ink opacity-0 group-hover/epic:opacity-100 transition-opacity"
                      aria-label="Delete epic"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <button
          onClick={onAddEpic}
          className="w-full py-2.5 border border-dashed border-rule text-ink-3 hover:text-accent-ink hover:border-accent/40 hover:bg-accent-wash/40 transition-colors rounded-[10px] font-mono text-[11px] uppercase tracking-[0.14em] flex items-center justify-center gap-2"
        >
          <Plus className="w-3 h-3" />
          New epic
        </button>
      </div>

      {/* Progress card */}
      <div className="bg-paper border border-rule-soft rounded-[14px] p-5 shrink-0">
        <div className="flex items-baseline justify-between mb-2.5">
          <span className="eyebrow">Progress</span>
          <span className="font-mono text-[11px] text-ink-3">
            {Math.round(completion)}%
          </span>
        </div>
        <div className="h-1.5 bg-paper-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent via-[oklch(0.62_0.13_90)] to-sage transition-[width] duration-700"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="font-serif text-[18px] font-medium leading-none text-ink">{value}</span>
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3 mt-1">
        {label}
      </span>
    </div>
  );
}

export default EpicSidebar;
