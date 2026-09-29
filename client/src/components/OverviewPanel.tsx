import type { ReactNode } from "react";
import { Flag, Target, Users, CircleSlash, ListChecks, Pencil, Plus, X } from "lucide-react";
import { colorForEpic, PRIORITY_CHIP } from "../lib/palette";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  prdUpdated,
  selectAllEpics,
  selectBlueprintMeta,
  selectStoryCountByEpic,
  type ProductRequirements,
} from "../store/slices/blueprintSlice";
import EditableText from "./EditableText";

interface Props {
  onOpenEpic: (epicId: string) => void;
}

const ADD_BTN =
  "inline-flex items-center gap-1.5 mt-3 px-2.5 py-1.5 rounded-lg border border-dashed border-rule text-ink-3 hover:text-accent-ink hover:border-accent/40 hover:bg-accent-wash/40 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors";

export function OverviewPanel({ onOpenEpic }: Props) {
  const dispatch = useAppDispatch();
  const meta = useAppSelector(selectBlueprintMeta);
  const epics = useAppSelector(selectAllEpics);
  const storyCounts = useAppSelector(selectStoryCountByEpic);
  if (!meta) return null;
  const prd = meta.productRequirementsDocument;

  const patch = (changes: Partial<ProductRequirements>) => dispatch(prdUpdated(changes));
  const setList = (key: "objectives" | "successMetrics" | "outOfScope", next: string[]) => patch({ [key]: next });

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-6 lg:px-10 py-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="eyebrow">Product overview</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
              <Pencil className="w-3 h-3" />
              Click any text to edit · saves automatically
            </span>
          </div>
          <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-medium tracking-[-0.02em] leading-[1.12] text-ink">
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

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard icon={Users} label="Audience">
            <EditableText
              as="p"
              value={prd.targetAudience}
              multiline
              onCommit={(targetAudience) => patch({ targetAudience })}
              placeholder="Who is this for?"
              aria-label="Audience"
              className="font-ui text-[14px] leading-relaxed text-ink"
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
              className="font-ui text-[14px] leading-relaxed text-ink"
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
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-rule-soft bg-paper p-6 shadow-[0_1px_0_var(--color-rule-soft)]">
            <div className="flex items-center gap-2 mb-4">
              <Flag className="w-4 h-4 text-accent" />
              <h3 className="eyebrow text-ink-2">Objectives</h3>
            </div>
            <StringList
              items={prd.objectives}
              onChange={(objectives) => setList("objectives", objectives)}
              placeholder="Add an objective"
              label="objective"
              marker="number"
            />
          </section>

          <section className="rounded-2xl border border-rule-soft bg-paper p-6 shadow-[0_1px_0_var(--color-rule-soft)]">
            <div className="flex items-center gap-2 mb-4">
              <ListChecks className="w-4 h-4 text-sage" />
              <h3 className="eyebrow text-ink-2">Success metrics</h3>
            </div>
            <StringList
              items={prd.successMetrics}
              onChange={(successMetrics) => setList("successMetrics", successMetrics)}
              placeholder="Add a metric"
              label="success metric"
              marker="dot"
            />
          </section>
        </div>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="eyebrow">Epics</h3>
            <div className="flex-1 h-px bg-rule-soft" />
            <span className="font-mono text-[11px] text-ink-3">
              Click an epic to open its stories
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {epics.map((epic, idx) => {
              const c = colorForEpic(idx);
              const storyCount = storyCounts[epic.epicId] ?? 0;
              return (
                <button
                  key={epic.epicId}
                  type="button"
                  onClick={() => onOpenEpic(epic.epicId)}
                  className="text-left rounded-2xl border border-rule-soft bg-paper p-5 hover:border-accent/40 hover:shadow-[0_12px_28px_-20px_oklch(0.3_0.04_50/.45)] transition-all"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span
                      className="font-mono text-[11px] uppercase tracking-[0.12em] inline-flex items-center gap-2"
                      style={{ color: c.ink }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: c.fg }} />
                      Epic {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.1em] px-2 py-[3px] rounded-full ${PRIORITY_CHIP[epic.priority]}`}
                    >
                      {epic.priority}
                    </span>
                  </div>
                  <h4 className="font-serif text-[22px] font-medium tracking-tight text-ink mb-1.5">
                    {epic.title}
                  </h4>
                  <p className="font-ui text-[14px] text-ink-2 leading-snug line-clamp-3">
                    {epic.description}
                  </p>
                  <p className="font-mono text-[11px] text-ink-3 mt-3">
                    {storyCount} {storyCount === 1 ? "story" : "stories"}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
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
    <article className="rounded-2xl border border-rule-soft bg-paper p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-ink-3" />
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
      <ul className="flex flex-col gap-2 m-0 p-0 list-none">
        {items.map((item, i) => (
          <li key={i} className="group/row flex items-start gap-3 font-ui text-[15px] text-ink leading-snug">
            {marker === "number" ? (
              <span className="font-mono text-[11px] text-ink-3 mt-1 shrink-0">{String(i + 1).padStart(2, "0")}</span>
            ) : marker === "dot" ? (
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-sage shrink-0" />
            ) : (
              <span className="font-mono text-[11px] text-ink-3 mt-1 shrink-0">–</span>
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
