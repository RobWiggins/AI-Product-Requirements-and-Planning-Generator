import { Flag, Target, Users, CircleSlash, ListChecks } from "lucide-react";
import { ProjectBlueprint } from "../lib/ai";
import { colorForEpic, PRIORITY_CHIP } from "../lib/palette";

interface Props {
  blueprint: ProjectBlueprint;
  onOpenEpic: (epicId: string) => void;
}

export function OverviewPanel({ blueprint, onOpenEpic }: Props) {
  const prd = blueprint.productRequirementsDocument;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-6 lg:px-10 py-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <span className="eyebrow">Product overview</span>
          <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-medium tracking-[-0.02em] leading-[1.12] text-ink">
            {blueprint.projectName}
          </h2>
          <p className="font-ui text-[16px] leading-relaxed text-ink-2 max-w-3xl">
            {prd?.overview ?? blueprint.description}
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard
            icon={Users}
            label="Audience"
            body={prd?.targetAudience ?? "Not specified"}
          />
          <InfoCard icon={Target} label="In scope" body={prd?.scope ?? "Not specified"} />
          <InfoCard
            icon={CircleSlash}
            label="Out of scope"
            body={(prd?.outOfScope ?? []).join(" · ") || "None listed"}
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-rule-soft bg-paper p-6 shadow-[0_1px_0_var(--color-rule-soft)]">
            <div className="flex items-center gap-2 mb-4">
              <Flag className="w-4 h-4 text-accent" />
              <h3 className="eyebrow text-ink-2">Objectives</h3>
            </div>
            <ul className="flex flex-col gap-2.5 m-0 p-0 list-none">
              {(prd?.objectives ?? []).map((item, i) => (
                <li key={i} className="flex gap-3 font-ui text-[15px] text-ink leading-snug">
                  <span className="font-mono text-[11px] text-ink-3 mt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-rule-soft bg-paper p-6 shadow-[0_1px_0_var(--color-rule-soft)]">
            <div className="flex items-center gap-2 mb-4">
              <ListChecks className="w-4 h-4 text-sage" />
              <h3 className="eyebrow text-ink-2">Success metrics</h3>
            </div>
            <ul className="flex flex-col gap-2.5 m-0 p-0 list-none">
              {(prd?.successMetrics ?? []).map((item, i) => (
                <li key={i} className="flex gap-3 font-ui text-[15px] text-ink leading-snug">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sage shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
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
            {blueprint.epics.map((epic, idx) => {
              const c = colorForEpic(idx);
              const storyCount = blueprint.userStories.filter((s) => s.epicId === epic.epicId)
                .length;
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
  body,
}: {
  icon: typeof Users;
  label: string;
  body: string;
}) {
  return (
    <article className="rounded-2xl border border-rule-soft bg-paper p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-ink-3" />
        <span className="eyebrow">{label}</span>
      </div>
      <p className="font-ui text-[14px] leading-relaxed text-ink m-0">{body}</p>
    </article>
  );
}

export default OverviewPanel;
