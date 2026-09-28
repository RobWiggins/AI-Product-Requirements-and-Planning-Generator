import { SlidersHorizontal } from "lucide-react";
import type { SaveState } from "../store/slices/projectsSlice";

interface Props {
  isGenerating: boolean;
  /** Persistence state of the open project; omitted when nothing is open. */
  saveState?: SaveState;
  saveError?: string | null;
  onToggleTweaks: () => void;
}

export function Footer({ isGenerating, saveState = "idle", saveError, onToggleTweaks }: Props) {
  const status = isGenerating
    ? { label: "Drafting", dot: "bg-accent animate-pulse" }
    : saveState === "saving"
      ? { label: "Saving", dot: "bg-sky animate-pulse" }
      : saveState === "error"
        ? { label: saveError ? `Save failed — ${saveError}` : "Save failed", dot: "bg-accent" }
        : saveState === "saved"
          ? { label: "Saved", dot: "bg-sage" }
          : { label: "Ready", dot: "bg-sage" };

  return (
    <footer className="shrink-0 z-20 h-10 border-t border-rule-soft bg-paper/90 backdrop-blur-md px-5 sm:px-8 flex items-center justify-between">
      <div
        role="status"
        className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 truncate"
      >
        <span aria-hidden className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
        <span className="truncate">{status.label}</span>
      </div>

      <button
        type="button"
        onClick={onToggleTweaks}
        className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 hover:text-ink transition-colors px-2 py-1 rounded-md hover:bg-paper-2"
        aria-label="Toggle appearance settings"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Appearance
      </button>
    </footer>
  );
}

export default Footer;
