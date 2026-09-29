import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, FileText, ListChecks, CheckSquare, Target, Sparkles, Layers, BookOpenText, Scale } from "lucide-react";

/**
 * Full-screen "work in progress" state shown while the model drafts a plan.
 *
 * The request is one long call with no server-side progress, so the stage list
 * advances on a timer to convey the *kind* of work happening. The final stage
 * only completes when the overlay unmounts (i.e. the response arrived).
 */

const STAGES = [
  { icon: BookOpenText, label: "Reading your brief", detail: "Pulling out the problem, audience, and constraints" },
  { icon: FileText, label: "Writing the PRD", detail: "Overview, objectives, success metrics, scope" },
  { icon: Layers, label: "Shaping epics", detail: "Grouping the work into a handful of domains" },
  { icon: ListChecks, label: "Drafting user stories", detail: "As-a / I-want / so-that, with acceptance criteria" },
  { icon: Sparkles, label: "Sketching Gherkin scenarios", detail: "Given / When / Then for each story" },
  { icon: CheckSquare, label: "Estimating tasks", detail: "Engineering work, hours, priority, dependencies" },
  { icon: Target, label: "Deciding MVP scope", detail: "In / Later / Out — with a reason for each" },
  { icon: Scale, label: "Cross-checking the plan", detail: "Making sure every id links up" },
] as const;

/** Seconds at which each stage becomes the active one. Total ≈ 75s; the last stage waits. */
const STAGE_STARTS = [0, 6, 16, 26, 40, 52, 64, 74];

const ORBIT = [
  "bg-accent",
  "bg-sage",
  "bg-sky",
  "bg-plum",
];

interface Props {
  /** The brief being drafted, echoed so the user sees what's in flight. */
  brief: string;
}

export function DraftingOverlay({ brief }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const activeIndex = STAGE_STARTS.reduce((acc, start, i) => (elapsed >= start ? i : acc), 0);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label="Drafting your plan"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-paper/85 backdrop-blur-md overflow-y-auto custom-scrollbar"
    >
      <motion.div
        initial={{ y: 18, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 10, scale: 0.98 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-3xl mx-4 my-8 rounded-3xl border border-rule bg-paper shadow-[0_2px_0_var(--color-rule-soft),0_40px_80px_-40px_oklch(0.4_0.06_50/.45)] p-7 sm:p-10 grid grid-cols-1 md:grid-cols-[auto_minmax(0,1fr)] gap-8 md:gap-12 items-start"
      >
        {/* ---- The mark -------------------------------------------------- */}
        <div className="flex flex-col items-center gap-5 md:pt-2">
          <div className="relative w-36 h-36 sm:w-44 sm:h-44" aria-hidden>
            {/* Soft breathing glow */}
            <div className="absolute inset-0 rounded-full bg-accent-wash animate-[drafting-breathe_2.8s_ease-in-out_infinite] motion-reduce:animate-none" />

            {/* Conic ring, slow spin */}
            <div
              className="absolute inset-2 rounded-full animate-[spin_5s_linear_infinite] motion-reduce:animate-none"
              style={{
                background:
                  "conic-gradient(from 0deg, var(--color-accent), var(--color-sage), var(--color-sky), var(--color-plum), var(--color-accent))",
                WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px))",
                mask: "radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px))",
              }}
            />

            {/* Dashed inner ring, counter-spin */}
            <div className="absolute inset-6 rounded-full border-2 border-dashed border-rule animate-[spin_14s_linear_infinite_reverse] motion-reduce:animate-none" />

            {/* Orbiting satellites */}
            {ORBIT.map((tone, i) => (
              <div
                key={tone}
                className="absolute inset-0 animate-[spin_3.6s_linear_infinite] motion-reduce:animate-none"
                style={{ animationDelay: `${-i * 0.9}s` }}
              >
                <span className={`absolute left-1/2 -top-0.5 -translate-x-1/2 w-3 h-3 rounded-full ${tone} shadow-[0_0_0_3px_var(--color-paper)]`} />
              </div>
            ))}

            {/* The glyph */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-accent text-[56px] sm:text-[68px] leading-none select-none animate-[drafting-tilt_2.4s_ease-in-out_infinite] motion-reduce:animate-none">
                ◐
              </span>
            </div>
          </div>

          <div className="font-mono text-[12px] tracking-[0.14em] text-ink-3 tabular-nums" aria-label={`Elapsed ${mm}:${ss}`}>
            {mm}:{ss}
          </div>
        </div>

        {/* ---- Copy + stages --------------------------------------------- */}
        <div className="min-w-0">
          <span className="eyebrow">Drafting in progress</span>
          <h2 className="font-serif text-[30px] sm:text-[36px] leading-[1.1] tracking-[-0.02em] text-ink mt-1.5 mb-3">
            Turning your paragraph into <em className="italic font-medium text-accent-ink">a plan</em>.
          </h2>
          <p className="font-ui text-[15px] leading-relaxed text-ink-2 m-0 mb-6 max-w-prose">
            This is real work — a PRD, epics, stories, scenarios, tasks, and scope decisions, all cross-linked.
            It usually takes <span className="text-ink font-medium">30–90 seconds</span>. You can keep this tab open.
          </p>

          <blockquote className="m-0 mb-7 pl-4 border-l-2 border-accent/40 font-serif italic text-[15px] text-ink-2 leading-snug line-clamp-3">
            {brief}
          </blockquote>

          <ol className="list-none m-0 p-0 flex flex-col gap-1">
            {STAGES.map((stage, i) => {
              const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
              const Icon = stage.icon;
              return (
                <li
                  key={stage.label}
                  aria-current={state === "active" ? "step" : undefined}
                  className={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 px-3 py-2 rounded-xl transition-colors ${
                    state === "active" ? "bg-accent-wash/60" : ""
                  }`}
                >
                  <span
                    className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                      state === "done"
                        ? "bg-sage text-paper border-sage"
                        : state === "active"
                          ? "bg-paper text-accent-ink border-accent/40 animate-[drafting-pulse-ring_1.6s_ease-out_infinite] motion-reduce:animate-none"
                          : "bg-paper-2 text-ink-3 border-rule-soft"
                    }`}
                  >
                    {state === "done" ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <Icon className="w-3.5 h-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block font-ui text-[15px] leading-snug ${
                        state === "pending" ? "text-ink-3" : state === "done" ? "text-ink-2 line-through decoration-rule" : "text-ink font-medium"
                      }`}
                    >
                      {stage.label}
                      {state === "active" && <span className="drafting-ellipsis inline-block w-6 text-left text-accent-ink" aria-hidden />}
                    </span>
                    {state === "active" && (
                      <span className="block font-ui text-[13px] text-ink-2/80 leading-snug mt-0.5">{stage.detail}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default DraftingOverlay;
