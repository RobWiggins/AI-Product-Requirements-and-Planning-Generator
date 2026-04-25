import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export interface TweakSettings {
  accentHue: number;
  serif: "newsreader" | "source" | "system";
}

interface Props {
  visible: boolean;
  settings: TweakSettings;
  onSet: (patch: Partial<TweakSettings>) => void;
  onClose: () => void;
}

const ACCENT_SWATCHES = [
  { label: "Terracotta", hue: 38 },
  { label: "Amber", hue: 65 },
  { label: "Sage", hue: 150 },
  { label: "Sky", hue: 235 },
  { label: "Iris", hue: 275 },
  { label: "Plum", hue: 330 },
];

const SERIF_OPTIONS: { value: TweakSettings["serif"]; label: string; sample: string }[] = [
  { value: "newsreader", label: "Newsreader", sample: "Aa" },
  { value: "source", label: "Source Serif", sample: "Aa" },
  { value: "system", label: "System", sample: "Aa" },
];

export function Tweaks({ visible, settings, onSet, onClose }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed bottom-12 right-4 z-30 w-72 bg-paper border border-rule rounded-[16px] shadow-[0_8px_40px_-10px_oklch(0.2_0.03_60/.35)] p-5 flex flex-col gap-5"
        >
          <div className="flex items-center justify-between">
            <span className="eyebrow">Appearance</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-ink-3 hover:text-ink hover:bg-paper-2 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Accent colour */}
          <div className="flex flex-col gap-2.5">
            <span className="font-mono text-[11px] text-ink-3">Accent colour</span>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_SWATCHES.map(({ label, hue }) => {
                const active = settings.accentHue === hue;
                return (
                  <button
                    key={hue}
                    title={label}
                    onClick={() => onSet({ accentHue: hue })}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      active ? "border-ink scale-110" : "border-transparent"
                    }`}
                    style={{ background: `oklch(0.56 0.14 ${hue})` }}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-[10px] text-ink-3 w-24">Custom hue</span>
              <input
                type="range"
                min={0}
                max={360}
                value={settings.accentHue}
                onChange={(e) => onSet({ accentHue: Number(e.target.value) })}
                className="flex-1 accent-[var(--color-accent)] h-1.5 cursor-pointer"
              />
              <span className="font-mono text-[10px] text-ink-3 w-8 text-right">{settings.accentHue}°</span>
            </div>
          </div>

          {/* Serif typeface */}
          <div className="flex flex-col gap-2.5">
            <span className="font-mono text-[11px] text-ink-3">Typeface</span>
            <div className="flex gap-2">
              {SERIF_OPTIONS.map(({ value, label, sample }) => {
                const active = settings.serif === value;
                const fontMap = {
                  newsreader: `"Newsreader", Georgia, serif`,
                  source: `"Source Serif 4", Georgia, serif`,
                  system: `Georgia, serif`,
                };
                return (
                  <button
                    key={value}
                    onClick={() => onSet({ serif: value })}
                    className={`flex-1 py-2.5 rounded-[10px] border text-center transition-colors ${
                      active
                        ? "border-accent bg-accent-wash text-accent-ink"
                        : "border-rule-soft bg-paper-2 text-ink-2 hover:border-rule hover:text-ink"
                    }`}
                  >
                    <span
                      className="block text-[22px] leading-none mb-1"
                      style={{ fontFamily: fontMap[value] }}
                    >
                      {sample}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export default Tweaks;
