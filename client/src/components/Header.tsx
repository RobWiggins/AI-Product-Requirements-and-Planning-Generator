import { FileText, Layers, Trash2 } from "lucide-react";
import { ProjectBlueprint } from "../lib/ai";

export type WorkspaceView = "overview" | "backlog";

interface Props {
  blueprint: ProjectBlueprint | null;
  workspaceView: WorkspaceView;
  onWorkspaceView: (view: WorkspaceView) => void;
  onClear: () => void;
}

export function Header({ blueprint, workspaceView, onWorkspaceView, onClear }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-rule-soft bg-paper/90 backdrop-blur-md px-5 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-5 min-w-0">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-accent text-[22px] -translate-y-px select-none">◐</span>
          <span className="font-serif text-[22px] font-semibold tracking-tight text-ink">
            StoryFlow
          </span>
        </div>

        {blueprint && (
          <>
            <span className="hidden sm:block h-6 w-px bg-rule-soft" />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-serif text-[15px] font-medium tracking-tight text-ink truncate">
                {blueprint.projectName}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 inline-flex items-center gap-2">
                <span className="text-accent-ink">v{blueprint.version}</span>
                <span aria-hidden>·</span>
                <span>{blueprint.epics.length} epics</span>
                <span aria-hidden>·</span>
                <span>{blueprint.userStories.length} stories</span>
                <span aria-hidden>·</span>
                <span>{blueprint.tasks.length} tasks</span>
              </span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {blueprint && (
          <div className="hidden sm:flex p-1 rounded-full bg-paper-2 border border-rule-soft">
            <button
              type="button"
              onClick={() => onWorkspaceView("overview")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-ui transition-colors ${
                workspaceView === "overview"
                  ? "bg-paper text-ink shadow-sm"
                  : "text-ink-3 hover:text-ink"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Overview
            </button>
            <button
              type="button"
              onClick={() => onWorkspaceView("backlog")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-ui transition-colors ${
                workspaceView === "backlog"
                  ? "bg-paper text-ink shadow-sm"
                  : "text-ink-3 hover:text-ink"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Backlog
            </button>
          </div>
        )}

        {blueprint ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.12em] text-ink-3 hover:text-accent-ink transition-colors px-3 py-2 rounded-full border border-rule-soft hover:border-accent/40 hover:bg-accent-wash/40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            New Draft
          </button>
        ) : (
          <span className="hidden sm:inline font-ui text-[13px] text-ink-3">
            Product plans from a paragraph
          </span>
        )}
      </div>
    </header>
  );
}

export default Header;
