import type { ReactNode } from "react";
import { ArrowRight, CircleSlash, Flag, ListChecks, Pencil, Plus, Target, Users, X } from "lucide-react";
import { colorForEpic, PRIORITY_CHIP } from "../lib/palette";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  prdUpdated,
  selectBlueprintMeta,
  selectEpicSummaries,
  type ProductRequirements,
} from "../store/slices/blueprintSlice";
import EditableText from "./EditableText";

interface Props {
  onOpenEpic: (epicId: string) => void;
}

const ADD_BTN =
  "inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg border border-dashed border-rule text-ink-3 hover:text-accent-ink hover:border-accent/40 hover:bg-accent-wash/40 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors";

/**
 * Overview is a map of the work, not a document dump.
 *
 *   header  — name + one-paragraph brief
 *   epics   — the first thing you can act on
 *   brief   — audience / scope / objectives sit beside or below as supporting context
 */
export function OverviewPanel({ onOpenEpic }: Props) {
  const dispatch = useAppDispatch();
  const meta = useAppSelector(selectBlueprintMeta);
  const summaries = useAppSelector(selectEpicSummaries);
  if (!meta) return null;
  const prd = meta.productRequirementsDocument;

  const patch = (changes: Partial<ProductRequirements>) => dispatch(prdUpdated(changes));
  const setList = (key: "objectives" | "successMetrics" | "outOfScope", next: string[]) => patch({ [key]: next });

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-4 sm:px-6 lg:px-10 py-5 sm:py-7">
      <div className="max-w-6xl mx-auto flex flex-col gap-7">
        <header className="flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3">
            <span className="eyebrow">Overview</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
              <Pencil className="w-3 h-3" />
              Click any text to edit · saves automatically
            </span>
          </div>
          <h2 className="font-serif text-[clamp(28px,4vw,40px)] font-medium tracking-[-0.02em] leading-[1.12] text-ink m-0">
            {meta.projectName}
          </h2>
          <EditableText
            as="p"
            value={prd.overview}
            multiline
            onCommit={(overview) => patch({ overview })}
            placeholder={meta.description || "What does this product do?"}
            aria-label="Product overview"
            className="font-ui text-[16px] leading-relaxed text-ink-2 max-w-3xl"
          />
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)] gap-6 xl:gap-8 items-start">
          <section aria-labelledby="epics-heading">
            <div className="flex items-center gap-3 mb-4">
              <h3 id="epics-heading" className="eyebrow m-0">
                Epics
              </h3>
              <div className="flex-1 h-px bg-rule-soft" />
              <span className="font-mono text-[11px] text-ink-3">
                {String(summaries.length).padStart(2, "0")} · open to edit stories
              </span>
            </div>

            {summaries.length === 0 ? (
              <p className="font-serif italic text-ink-3 m-0 py-10 text-center rounded-2xl border border-dashed border-rule">
                No epics yet — add one from the sidebar.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summaries.map(({ epic, index, storyCount, taskCount, done }) => {
                  const c = colorForEpic(index);
                  const pct = taskCount ? Math.round((done / taskCount) * 100) : 0;
                  return (
                    <button
                      key={epic.epicId}
                      type="button"
                      onClick={() => onOpenEpic(epic.epicId)}
                      className="group/epic text-left rounded-2xl border border-rule-soft bg-paper overflow-hidden hover:border-accent/40 hover:shadow-[0_12px_28px_-20px_oklch(0.3_0.04_50/.45)] transition-all"
                    >
                      <span className="block h-1" style={{ background: c.fg }} aria-hidden />
                      <span className="block p-5">
                        <span className="flex items-center justify-between gap-3 mb-2">
                          <span
                            className="font-mono text-[11px] uppercase tracking-[0.12em] inline-flex items-center gap-2"
                            style={{ color: c.ink }}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ background: c.fg }} />
                            Epic {String(index + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={`font-mono text-[10px] uppercase tracking-[0.1em] px-2 py-[3px] rounded-full ${PRIORITY_CHIP[epic.priority]}`}
                          >
                            {epic.priority}
                          </span>
                        </span>
                        <h4 className="font-serif text-[22px] font-medium tracking-tight text-ink mb-1.5 m-0">
                          {epic.title}
                        </h4>
                        <p className="font-ui text-[14px] text-ink-2 leading-snug line-clamp-3 m-0">
                          {epic.description}
                        </p>
                        <span className="mt-4 flex items-center gap-3 font-mono text-[11px] text-ink-3">
                          <span>
                            {storyCount} {storyCount === 1 ? "story" : "stories"}
                          </span>
                          <span aria-hidden>·</span>
                          <span>
                            {done}/{taskCount} tasks
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 ml-auto text-ink-3 opacity-0 group-hover/epic:opacity-100 group-hover/epic:text-accent-ink transition-opacity" />
                        </span>
                        <span className="mt-2 block h-1 bg-paper-3 rounded-full overflow-hidden">
                          <span
                            className="block h-full rounded-full transition-[width] duration-500"
                            style={{ width: `${pct}%`, background: c.fg }}
                          />
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside aria-labelledby="brief-heading" className="flex flex-col gap-3 xl:sticky xl:top-0">
            <div className="flex items-center gap-3">
              <h3 id="brief-heading" className="eyebrow m-0">
                Brief
              </h3>
              <div className="flex-1 h-px bg-rule-soft" />
            </div>

            <InfoCard icon={Users} label="Audience">
              <EditableText
                as="p"
                value={prd.targetAudience}
                multiline
                onCommit={(targetAudience) => patch({ targetAudience })}
                placeholder="Who is this for?"
                aria-label="Audience"
                className="font-ui text-[13px] leading-relaxed text-ink"
              />
            </InfoCard>
            <InfoCard icon={Target} label="In scope">
              <EditableText
                as="p"
                value={prd.scope}
                multiline
                onCommit={(scope) => patch({ scope })}
                placeholder="What is included?"
                aria-label="In scope"
                className="font-ui text-[13px] leading-relaxed text-ink"
              />
            </InfoCard>
            <InfoCard icon={CircleSlash} label="Out of scope">
              <StringList
                items={prd.outOfScope}
                onChange={(outOfScope) => setList("outOfScope", outOfScope)}
                placeholder="Something this product will not do"
                label="out of scope item"
                marker="dash"
              />
            </InfoCard>
            <InfoCard icon={Flag} label="Objectives">
              <StringList
                items={prd.objectives}
                onChange={(objectives) => setList("objectives", objectives)}
                placeholder="Add an objective"
                label="objective"
                marker="number"
              />
            </InfoCard>
            <InfoCard icon={ListChecks} label="Success metrics">
              <StringList
                items={prd.successMetrics}
                onChange={(successMetrics) => setList("successMetrics", successMetrics)}
                placeholder="Add a metric"
                label="success metric"
                marker="dot"
              />
            </InfoCard>
          </aside>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Users;
  label: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-rule-soft bg-paper px-4 py-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-ink-3" />
        <span className="eyebrow">{label}</span>
      </div>
      {children}
    </article>
  );
}

function StringList({
  items,
  onChange,
  placeholder,
  label,
  marker,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  label: string;
  marker: "number" | "dot" | "dash";
}) {
  const setAt = (i: number, text: string) => onChange(items.map((item, idx) => (idx === i ? text : item)));
  const removeAt = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div>
      <ul className="flex flex-col gap-1.5 m-0 p-0 list-none">
        {items.map((item, i) => (
          <li key={i} className="group/row flex items-start gap-2.5 font-ui text-[13px] text-ink leading-snug">
            {marker === "number" ? (
              <span className="font-mono text-[10px] text-ink-3 mt-0.5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
            ) : marker === "dot" ? (
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage shrink-0" />
            ) : (
              <span className="font-mono text-[11px] text-ink-3 mt-0.5 shrink-0">–</span>
            )}
            <EditableText
              value={item}
              onCommit={(text) => setAt(i, text)}
              placeholder={placeholder}
              aria-label={`${label} ${i + 1}`}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="p-1 rounded-md text-ink-3 hover:text-accent-ink hover:bg-accent-wash/60 opacity-0 group-hover/row:opacity-100 focus:opacity-100 transition-opacity"
              aria-label={`Remove ${label} ${i + 1}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onChange([...items, ""])} className={ADD_BTN}>
        <Plus className="w-3 h-3" />
        Add
      </button>
    </div>
  );
}

export default OverviewPanel;
