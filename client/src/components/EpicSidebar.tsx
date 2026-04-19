import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { Epic, ProjectBlueprint } from "../types";

interface Props {
  epics: Epic[];
  activeEpicId: string | null;
  blueprint: ProjectBlueprint;
  onSelectEpic: (id: string) => void;
  onDeleteEpic: (id: string) => void;
  onAddEpic: () => void;
}

function globalCompletion(blueprint: ProjectBlueprint): number {
  const totalStories = blueprint.epics.reduce((acc, e) => acc + e.stories.length, 0);
  if (totalStories === 0) return 0;
  const completedWeight = blueprint.epics.reduce(
    (acc, e) =>
      acc +
      e.stories.reduce(
        (sAcc, s) => sAcc + s.tasks.filter((t) => t.status === "done").length / Math.max(1, s.tasks.length),
        0
      ),
    0
  );
  return (completedWeight / totalStories) * 100;
}

export function EpicSidebar({ epics, activeEpicId, blueprint, onSelectEpic, onDeleteEpic, onAddEpic }: Props) {
  return (
    <aside className="w-1/4 flex flex-col gap-4">
      <div className="p-4 border border-border-main bg-white rounded-xl flex-1 flex flex-col min-h-0 shadow-sm">
        <h3 className="text-[11px] font-bold text-gray-400 mb-4 tracking-[0.1em] uppercase shrink-0">
          Epics / Architecture
        </h3>

        <div className="space-y-1 overflow-y-auto custom-scrollbar pr-2 mb-4">
          {epics.map((epic) => (
            <div key={epic.id} className="relative group/epic">
              <button
                onClick={() => onSelectEpic(epic.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border flex items-center justify-between ${
                  activeEpicId === epic.id
                    ? "bg-accent-light border-accent/20 text-accent font-semibold"
                    : "bg-transparent border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-mono ${activeEpicId === epic.id ? "text-accent" : "text-gray-400"}`}>
                    {String(epic.order).padStart(2, "0")}
                  </span>
                  <span className="text-sm truncate pr-4">{epic.title}</span>
                </div>
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    activeEpicId === epic.id ? "rotate-0 opacity-100" : "-rotate-90 opacity-0 group-hover/epic:opacity-100"
                  }`}
                />
              </button>

              {activeEpicId !== epic.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteEpic(epic.id); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover/epic:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onAddEpic}
          className="w-full py-2 border border-dashed border-border-main text-gray-400 hover:text-accent hover:border-accent/50 transition-all rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <Plus className="w-3 h-3" />
          NEW EPIC
        </button>
      </div>

      <div className="p-5 border border-border-main bg-white rounded-xl overflow-hidden relative shrink-0 shadow-sm">
        <h4 className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Global Completion</h4>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-1000"
            style={{ width: `${globalCompletion(blueprint)}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
