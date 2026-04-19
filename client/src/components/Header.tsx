import { Layers, Trash2 } from "lucide-react";
import { ProjectBlueprint } from "../types";

interface Props {
  blueprint: ProjectBlueprint | null;
  onClear: () => void;
}

export function Header({ blueprint, onClear }: Props) {
  return (
    <header className="relative z-10 border-b border-border-main bg-white px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
          <Layers className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">STORYFLOW AI</h1>
          <p className="text-[10px] uppercase tracking-widest text-accent font-bold">
            Professional // Requirements Architect
          </p>
        </div>
      </div>

      {blueprint && (
        <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top duration-500">
          <button
            onClick={onClear}
            className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            CLEAR PROJECT
          </button>
        </div>
      )}
    </header>
  );
}
