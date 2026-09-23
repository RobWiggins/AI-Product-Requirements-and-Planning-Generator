import { SlidersHorizontal } from "lucide-react";

interface Props {
  isGenerating: boolean;
  onToggleTweaks: () => void;
}

export function Footer({ isGenerating, onToggleTweaks }: Props) {
  return (
    <footer className="shrink-0 z-20 h-10 border-t border-rule-soft bg-paper/90 backdrop-blur-md px-5 sm:px-8 flex items-center justify-between">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        <span
          aria-hidden
          className={`w-2 h-2 rounded-full ${isGenerating ? "bg-accent animate-pulse" : "bg-sage"}`}
        />
        {isGenerating ? "Drafting" : "Ready"}
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
