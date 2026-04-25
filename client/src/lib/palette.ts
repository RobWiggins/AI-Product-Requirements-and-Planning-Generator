// Shared visual palette used across the blueprint UI.
// Each epic gets one of these colour cycles so the canvas is *vibrant*
// without abandoning the warm editorial paper aesthetic.

export interface EpicColor {
  name: string;
  /** css color, used for swatches, dots, accents */
  fg: string;
  /** css color, used for backgrounds & washes */
  wash: string;
  /** css color, used for emphasised ink (text on wash) */
  ink: string;
  /** Tailwind class equivalents for static use */
  classes: {
    text: string;
    bg: string;
    border: string;
    chip: string;
  };
}

export const EPIC_COLORS: EpicColor[] = [
  {
    name: "terracotta",
    fg: "var(--color-accent)",
    wash: "var(--color-accent-wash)",
    ink: "var(--color-accent-ink)",
    classes: {
      text: "text-accent-ink",
      bg: "bg-accent-wash",
      border: "border-accent/30",
      chip: "bg-accent-wash text-accent-ink",
    },
  },
  {
    name: "sage",
    fg: "var(--color-sage)",
    wash: "var(--color-sage-wash)",
    ink: "var(--color-sage-ink)",
    classes: {
      text: "text-sage-ink",
      bg: "bg-sage-wash",
      border: "border-sage/30",
      chip: "bg-sage-wash text-sage-ink",
    },
  },
  {
    name: "sky",
    fg: "var(--color-sky)",
    wash: "var(--color-sky-wash)",
    ink: "oklch(0.38 0.08 235)",
    classes: {
      text: "text-[oklch(0.38_0.08_235)]",
      bg: "bg-sky-wash",
      border: "border-sky/30",
      chip: "bg-sky-wash text-[oklch(0.38_0.08_235)]",
    },
  },
  {
    name: "plum",
    fg: "var(--color-plum)",
    wash: "var(--color-plum-wash)",
    ink: "oklch(0.38 0.1 330)",
    classes: {
      text: "text-[oklch(0.38_0.1_330)]",
      bg: "bg-plum-wash",
      border: "border-plum/30",
      chip: "bg-plum-wash text-[oklch(0.38_0.1_330)]",
    },
  },
  {
    name: "amber",
    fg: "oklch(0.7 0.13 90)",
    wash: "oklch(0.94 0.05 90)",
    ink: "oklch(0.4 0.09 90)",
    classes: {
      text: "text-[oklch(0.4_0.09_90)]",
      bg: "bg-[oklch(0.94_0.05_90)]",
      border: "border-[oklch(0.7_0.13_90)]/30",
      chip: "bg-[oklch(0.94_0.05_90)] text-[oklch(0.4_0.09_90)]",
    },
  },
];

export function colorForEpic(idx: number): EpicColor {
  return EPIC_COLORS[((idx % EPIC_COLORS.length) + EPIC_COLORS.length) % EPIC_COLORS.length];
}

export type PriorityLevel = "High" | "Medium" | "Low";

export const PRIORITY_CHIP: Record<PriorityLevel, string> = {
  High: "bg-accent-wash text-accent-ink ring-1 ring-accent/30",
  Medium: "bg-[oklch(0.94_0.05_90)] text-[oklch(0.4_0.09_90)] ring-1 ring-[oklch(0.7_0.13_90)]/30",
  Low: "bg-sage-wash text-sage-ink ring-1 ring-sage/30",
};

export const PRIORITY_DOT: Record<PriorityLevel, string> = {
  High: "bg-accent",
  Medium: "bg-[oklch(0.7_0.13_90)]",
  Low: "bg-sage",
};
