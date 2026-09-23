import { AlertCircle, ArrowRight, FileText, ListChecks, CheckSquare, Target, Sparkles, Loader2 } from "lucide-react";

interface Props {
  goalInput: string;
  isGenerating: boolean;
  error: string | null;
  onChange: (val: string) => void;
  onGenerate: () => void;
}

const OUTPUTS = [
  {
    icon: FileText,
    title: "PRD",
    body: "Problem, goals, non-goals, personas, success metrics.",
    tile: "bg-accent-wash text-accent-ink",
  },
  {
    icon: ListChecks,
    title: "User stories",
    body: "As-a / I-want / so-that with crisp acceptance criteria.",
    tile: "bg-sage-wash text-sage-ink",
  },
  {
    icon: CheckSquare,
    title: "Tasks",
    body: "Engineering work with estimates, priority, and dependencies.",
    tile: "bg-sky-wash text-[oklch(0.38_0.08_235)]",
  },
  {
    icon: Target,
    title: "MVP scope",
    body: "In / Later / Out — each decision reasoned, not asserted.",
    tile: "bg-plum-wash text-[oklch(0.38_0.1_330)]",
  },
];

const EXAMPLES = [
  "An app that helps dog owners find safe, trusted playdates for their dogs nearby.",
  "A weekly review tool for solo founders — pulls from calendar, GitHub, and Stripe.",
  "A plant-care companion that uses your phone camera to diagnose sick houseplants.",
  "A neighborhood tool-sharing app for apartment buildings — ladders, drills, pasta pots.",
];

export function GoalInput({ goalInput, isGenerating, error, onChange, onGenerate }: Props) {
  const canSubmit = goalInput.trim().length > 20 && !isGenerating;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-10 xl:gap-14 items-start">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-wash text-accent-ink font-mono text-[11px] uppercase tracking-[0.14em] mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            For solo founders &amp; indie makers
          </div>

          <h2 className="font-serif text-[clamp(40px,5.4vw,68px)] leading-[1.05] tracking-[-0.025em] font-normal text-ink mb-5">
            From <em className="italic font-medium text-accent-ink">a single paragraph</em>
            <br />
            to a full product plan.
          </h2>

          <p className="font-ui text-[18px] leading-relaxed text-ink-2 max-w-xl">
            Describe the problem you want to solve. StoryFlow drafts a PRD, user stories
            with acceptance criteria, Gherkin scenarios, and engineering tasks — all
            cross-linked and editable.
          </p>
        </div>

        <section className="bg-paper border border-rule rounded-2xl p-5 sm:p-6 shadow-[0_2px_0_var(--color-rule-soft),0_18px_40px_-24px_oklch(0.4_0.06_50/.28)] focus-within:ring-2 focus-within:ring-accent/40 transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow">The problem, in your words</span>
            <span className="font-mono text-[11px] text-ink-3">{goalInput.length} / 1200</span>
          </div>
          <textarea
            value={goalInput}
            onChange={(e) => onChange(e.target.value.slice(0, 1200))}
            placeholder="e.g. An app that helps dog owners in a city find safe, trusted playdates for their dogs — matching by size, temperament, neighborhood, and schedule…"
            rows={7}
            className="w-full resize-none border-none outline-none bg-transparent font-serif text-[18px] sm:text-[20px] leading-[1.5] text-ink placeholder:text-ink-3/80 py-2"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 mt-2 pt-4 border-t border-dashed border-rule">
            <button
              type="button"
              onClick={() => onChange(EXAMPLES[0])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper-2 border border-rule-soft text-[13px] text-ink-2 hover:bg-paper-3 hover:text-ink transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Try an example
            </button>
            <button
              type="button"
              onClick={onGenerate}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-ink text-paper font-ui text-[15px] font-medium shadow-[0_6px_14px_-6px_oklch(0.2_0.02_60/.5)] hover:bg-accent-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Drafting…
                </>
              ) : (
                <>
                  Draft my plan
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </section>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-accent-wash border border-accent/20 rounded-xl flex items-start gap-3 text-accent-ink text-sm font-ui">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="mt-12">
        <span className="block font-serif italic text-[16px] text-ink-3 mb-4">
          — or a seed from the pile:
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(ex)}
              className="grid grid-cols-[auto_1fr] items-start gap-3 p-4 text-left rounded-xl border border-rule-soft bg-paper hover:border-accent/40 hover:bg-accent-wash/30 transition-colors"
            >
              <span className="font-mono text-[11px] text-ink-3 mt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-ui text-[15px] text-ink leading-snug">{ex}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="mt-14">
        <div className="flex items-center gap-3.5 mb-6">
          <span className="eyebrow">What you'll get</span>
          <div className="flex-1 h-px bg-rule" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {OUTPUTS.map((o, i) => (
            <article
              key={i}
              className="p-5 rounded-2xl border border-rule-soft bg-paper flex flex-col gap-2"
            >
              <div
                className={`w-9 h-9 rounded-[10px] border border-rule-soft flex items-center justify-center mb-1 ${o.tile}`}
              >
                <o.icon className="w-[18px] h-[18px]" />
              </div>
              <h3 className="font-serif text-[20px] font-medium tracking-tight text-ink m-0">
                {o.title}
              </h3>
              <p className="text-[14px] text-ink-2 leading-snug m-0 font-ui">{o.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default GoalInput;
