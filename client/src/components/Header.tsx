import { FileText, Layers, Trash2 } from "lucide-react";
import { ProjectBlueprint } from "../lib/ai";

export type WorkspaceView = "overview" | "backlog";

interface Props {
  blueprint: ProjectBlueprint | null;
  workspaceView: WorkspaceView;
  onWorkspaceView: (view: WorkspaceView) => void;
  onClear: () => void;
  /** Right-aligned account controls (e.g. <UserMenu />). */
  accountMenu?: React.ReactNode;
}

export function Header({ blueprint, workspaceView, onWorkspaceView, onClear, accountMenu }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-rule-soft bg-paper/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3 min-w-0">
      <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onWorkspaceView("overview")}
          aria-label="Back to overview"
          className="flex items-center gap-2.5 shrink-0 rounded-lg -ml-1 px-1 py-0.5 hover:opacity-80 transition-opacity"
        >
          <span className="text-accent text-[22px] -translate-y-px select-none">◐</span>
          <span className="font-serif text-[22px] font-semibold tracking-tight text-ink">
            StoryFlow
          </span>
        </button>

        {blueprint && (
          <>
            <span className="hidden md:block h-6 w-px bg-rule-soft" />
            <div className="hidden sm:flex flex-col leading-tight min-w-0">
              <span className="font-serif text-[15px] font-medium tracking-tight text-ink truncate">
                {blueprint.projectName}
              </span>
              <span className="hidden lg:inline-flex font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 items-center gap-2">
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

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
            aria-label="New draft"
            className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.12em] text-ink-3 hover:text-accent-ink transition-colors px-2.5 sm:px-3 py-2 rounded-full border border-rule-soft hover:border-accent/40 hover:bg-accent-wash/40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Draft</span>
          </button>
        ) : (
          <span className="hidden sm:inline font-ui text-[13px] text-ink-3">
            Product plans from a paragraph
          </span>
        )}

        {accountMenu}
      </div>
    </header>
  );
}

export default Header;
