interface Props {
  isGenerating: boolean;
}

export function Footer({ isGenerating }: Props) {
  return (
    <footer className="fixed bottom-0 inset-x-0 border-t border-border-main bg-white h-12 flex items-center justify-between px-6 z-20">
      <div className="flex items-center gap-6 text-[11px] font-bold text-gray-400 uppercase tracking-wide">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isGenerating ? "bg-orange-500 animate-pulse" : "bg-green-500"
            }`}
          />
          {isGenerating ? "PROCESSING" : "SYSTEM_CONNECTED"}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-accent/60">NODE:</span> US-EAST-1
        </div>
      </div>
      <div className="text-[11px] font-bold text-gray-300 tracking-wider uppercase">
        StoryFlow AI v1.2.0-stable
      </div>
    </footer>
  );
}
