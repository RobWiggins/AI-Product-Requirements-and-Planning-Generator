import { Trash2, Plus } from "lucide-react";
import { ProjectBlueprint } from "../lib/ai";

interface Props {
  blueprint: ProjectBlueprint | null;
  onClear: () => void;
}

export function Header({ blueprint, onClear }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-rule-soft bg-paper/80 backdrop-blur-md px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6 min-w-0">
        <div className="flex items-center gap-2.5">
          <span className="text-accent text-[22px] -translate-y-px select-none">◐</span>
          <span className="font-serif text-[22px] font-semibold tracking-tight text-ink">
            StoryFlow
          </span>
        </div>

        {blueprint && (
          <>
            <span className="font-serif text-ink-3 text-xl font-light">/</span>
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

        {!blueprint && (
          <nav className="hidden md:flex gap-6 text-[14px] text-ink-2 font-body">
            <button className="hover:text-ink transition-colors">Examples</button>
            <button className="hover:text-ink transition-colors">Method</button>
            <button className="hover:text-ink transition-colors">Changelog</button>
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        {blueprint ? (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.12em] text-ink-3 hover:text-accent-ink transition-colors px-3 py-2 rounded-full border border-rule-soft hover:border-accent/40 hover:bg-accent-wash/40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            New Draft
          </button>
        ) : (
          <>
            <button className="text-[14px] text-ink-2 hover:text-ink transition-colors hidden sm:inline-flex items-center gap-1.5">
              Sign in
            </button>
            <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-ink text-paper text-[13px] font-body hover:bg-accent-ink transition-colors shadow-[0_6px_14px_-6px_oklch(0.2_0.02_60/.4)]">
              <Plus className="w-3.5 h-3.5" />
              Get early access
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;
