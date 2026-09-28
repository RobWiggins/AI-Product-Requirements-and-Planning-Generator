import { useState } from "react";
import { AlertCircle, FolderOpen, Loader2, Trash2 } from "lucide-react";
import type { ProjectSummary } from "../lib/api";
import { timeAgo } from "../lib/format";

interface Props {
  projects: ProjectSummary[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  openingId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

/** The signed-in user's saved plans, shown on the landing page. */
export function ProjectList({ projects, status, error, openingId, onOpen, onDelete }: Props) {
  if (status === "ready" && projects.length === 0 && !error) return null;

  return (
    <section className="mt-12" aria-labelledby="saved-plans-heading">
      <div className="flex items-center gap-3.5 mb-5">
        <span id="saved-plans-heading" className="eyebrow">
          Your saved plans
        </span>
        <div className="flex-1 h-px bg-rule" />
        {status === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-3" />}
        {status === "ready" && (
          <span className="font-mono text-[11px] text-ink-3">{projects.length.toString().padStart(2, "0")}</span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-accent-wash border border-accent/20 rounded-xl flex items-start gap-2.5 text-accent-ink text-[13px] font-ui">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="m-0">{error}</p>
        </div>
      )}

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none p-0 m-0">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            opening={openingId === p.id}
            onOpen={() => onOpen(p.id)}
            onDelete={() => onDelete(p.id)}
          />
        ))}
      </ul>
    </section>
  );
}

function ProjectCard({
  project: p,
  opening,
  onOpen,
  onDelete,
}: {
  project: ProjectSummary;
  opening: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const pct = p.taskCount ? Math.round((p.completedTaskCount / p.taskCount) * 100) : 0;

  return (
    <li className="relative rounded-2xl border border-rule-soft bg-paper hover:border-accent/40 transition-colors">
      <button
        type="button"
        onClick={onOpen}
        disabled={opening}
        className="w-full text-left p-4 pr-12 rounded-2xl disabled:opacity-60"
        aria-label={`Open ${p.projectName}`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-serif text-[18px] font-medium tracking-tight text-ink truncate">{p.projectName}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 shrink-0">
            {opening ? "Opening…" : timeAgo(p.updatedAt)}
          </span>
        </div>
        <p className="font-ui text-[13px] text-ink-2 leading-snug mt-1 mb-3 line-clamp-2 m-0">{p.description}</p>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          <span className="text-accent-ink">v{p.version}</span>
          <span aria-hidden>·</span>
          <span>{p.epicCount} epics</span>
          <span aria-hidden>·</span>
          <span>{p.storyCount} stories</span>
          <span aria-hidden>·</span>
          <span>
            {p.completedTaskCount}/{p.taskCount} tasks
          </span>
        </div>
        <div className="mt-2.5 h-1 bg-paper-3 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-accent via-[oklch(0.62_0.13_90)] to-sage" style={{ width: `${pct}%` }} />
        </div>
      </button>

      <div className="absolute right-2 top-2 flex items-center gap-1">
        {confirming ? (
          <>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onDelete();
              }}
              className="px-2 py-1 rounded-lg bg-accent-ink text-paper font-mono text-[10px] uppercase tracking-[0.12em]"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="px-2 py-1 rounded-lg border border-rule-soft text-ink-3 font-mono text-[10px] uppercase tracking-[0.12em] hover:text-ink"
            >
              Keep
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${p.projectName}`}
            className="p-1.5 rounded-lg text-ink-3 hover:text-accent-ink hover:bg-accent-wash/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {opening && (
        <span className="absolute left-4 bottom-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-accent-ink">
          <FolderOpen className="w-3 h-3" />
        </span>
      )}
    </li>
  );
}

export default ProjectList;
