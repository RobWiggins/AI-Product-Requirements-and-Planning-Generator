import { ChevronRight, FileText, Plus, Trash2 } from "lucide-react";
import { ProjectBlueprint } from "../lib/ai";
import { colorForEpic } from "../lib/palette";
import type { WorkspaceView } from "./Header";

interface Props {
  blueprint: ProjectBlueprint;
  workspaceView: WorkspaceView;
  activeEpicId: string | null;
  completedTaskIds: Set<string>;
  onSelectOverview: () => void;
  onSelectEpic: (id: string) => void;
  onDeleteEpic: (id: string) => void;
  onAddEpic: () => void;
}

export function EpicSidebar({
  blueprint,
  workspaceView,
  activeEpicId,
  completedTaskIds,
  onSelectOverview,
  onSelectEpic,
  onDeleteEpic,
  onAddEpic,
}: Props) {
  const total = blueprint.tasks.length;
  const done = blueprint.tasks.filter((t) => completedTaskIds.has(t.taskId)).length;
  const completion = total ? (done / total) * 100 : 0;

  return (
    <aside className="w-[17.5rem] xl:w-80 shrink-0 flex flex-col gap-4 h-full min-h-0">
      <button
        type="button"
        onClick={onSelectOverview}
        className={`w-full text-left rounded-2xl border p-4 transition-colors ${
          workspaceView === "overview"
            ? "border-accent/40 bg-accent-wash/50"
            : "border-rule-soft bg-paper hover:border-accent/30"
        }`}
      >
        <span className="eyebrow inline-flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" />
          Overview
        </span>
        <p className="font-ui text-[13px] text-ink-2 mt-1.5 leading-snug line-clamp-2">
          {blueprint.description}
        </p>
      </button>

      <div className="flex-1 flex flex-col min-h-0 bg-paper border border-rule-soft rounded-2xl p-4 shadow-[0_1px_0_var(--color-rule-soft)]">
        <div className="flex items-center gap-3 mb-3 shrink-0">
          <span className="eyebrow">Epics</span>
          <div className="flex-1 h-px bg-rule-soft" />
          <span className="font-mono text-[11px] text-ink-3">
            {blueprint.epics.length.toString().padStart(2, "0")}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar -mr-1 pr-1 mb-3">
          <ul className="flex flex-col gap-1">
            {blueprint.epics.map((epic, idx) => {
              const active = workspaceView === "backlog" && activeEpicId === epic.epicId;
              const c = colorForEpic(idx);
              const storyCount = blueprint.userStories.filter(
                (s) => s.epicId === epic.epicId
              ).length;
              return (
                <li key={epic.epicId} className="relative group/epic">
                  <button
                    type="button"
                    onClick={() => onSelectEpic(epic.epicId)}
                    className={`w-full text-left flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                      active ? "bg-paper-2 text-ink" : "text-ink-2 hover:bg-paper-2 hover:text-ink"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: c.fg }}
                      aria-hidden
                    />
                    <span className={`font-ui text-[14px] leading-snug truncate ${active ? "font-semibold" : ""}`}>
                      {epic.title}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-ink-3">
                      {storyCount.toString().padStart(2, "0")}
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 ${active ? "opacity-100" : "opacity-0 group-hover/epic:opacity-100"}`}
                      style={{ color: c.fg }}
                    />
                  </button>

                  {!active && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEpic(epic.epicId);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-3 hover:text-accent-ink opacity-0 group-hover/epic:opacity-100 transition-opacity"
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
          type="button"
          onClick={onAddEpic}
          className="w-full py-2.5 border border-dashed border-rule text-ink-3 hover:text-accent-ink hover:border-accent/40 hover:bg-accent-wash/40 transition-colors rounded-xl font-mono text-[11px] uppercase tracking-[0.14em] flex items-center justify-center gap-2"
        >
          <Plus className="w-3 h-3" />
          New epic
        </button>
      </div>

      <div className="bg-paper border border-rule-soft rounded-2xl p-4 shrink-0">
        <div className="flex items-baseline justify-between mb-2.5">
          <span className="eyebrow">Tasks done</span>
          <span className="font-mono text-[11px] text-ink-3">
            {done}/{total} · {Math.round(completion)}%
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

export default EpicSidebar;
