import { AnimatePresence, motion, Reorder } from "motion/react";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Code2,
  FileText,
  GripVertical,
  Link2,
  Trash2,
} from "lucide-react";
import { GherkinScenario, Task, UserStory } from "../lib/ai";
import { EpicColor, PRIORITY_CHIP, PRIORITY_DOT } from "../lib/palette";

interface Props {
  story: UserStory;
  index: number;
  accentClasses: EpicColor;
  gherkin: GherkinScenario | null;
  tasks: Task[];
  completedTaskIds: Set<string>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<UserStory>) => void;
  onDelete: () => void;
  onToggleTask: (taskId: string) => void;
}

export function StoryCard({
  story,
  index,
  accentClasses,
  gherkin,
  tasks,
  completedTaskIds,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onToggleTask,
}: Props) {
  const totalEstHours = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
  const completedHere = tasks.filter((t) => completedTaskIds.has(t.taskId)).length;

  return (
    <Reorder.Item
      value={story}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group border-b border-rule-soft transition-[background,padding,margin,border-radius] ${
        isExpanded
          ? "bg-gradient-to-b from-[oklch(0.97_0.015_85)] to-paper rounded-[12px] px-6 -mx-6 py-5"
          : "py-5"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="cursor-grab active:cursor-grabbing text-ink-3 hover:text-ink opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <span className="font-mono text-[11px] tracking-[0.1em] text-ink-3 shrink-0">
            S-{String(index + 1).padStart(2, "0")}
          </span>

          <span
            className={`font-mono text-[10px] uppercase tracking-[0.1em] px-2 py-[3px] rounded-full ${
              PRIORITY_CHIP[story.priority]
            }`}
          >
            {story.priority}
          </span>

          {tasks.length > 0 && (
            <span className="font-mono text-[10px] text-ink-3 inline-flex items-center gap-1.5 shrink-0">
              <Clock className="w-3 h-3" />
              {totalEstHours}h · {completedHere}/{tasks.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onDelete}
            className="p-1.5 text-ink-3 hover:text-accent-ink opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete story"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleExpand}
            className="p-1.5 text-ink-3 hover:text-ink transition-colors"
            aria-label="Toggle details"
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform ${
                isExpanded ? `rotate-90 ${accentClasses.classes.text}` : ""
              }`}
            />
          </button>
        </div>
      </div>

      <h4
        className="font-serif text-[22px] font-medium tracking-[-0.01em] leading-snug text-ink outline-none mt-2 focus:text-accent-ink transition-colors"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onUpdate({ title: e.currentTarget.innerText })}
      >
        {story.title}
      </h4>

      {/* The "as a / I want / so that" line, with italic role markers */}
      <p className="font-serif text-[16px] leading-[1.55] text-ink mt-1.5">
        <span className="italic text-ink-3">As </span>
        <span
          className="outline-none focus:text-accent-ink transition-colors"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onUpdate({ asA: e.currentTarget.innerText })}
        >
          {story.asA}
        </span>
        <span className="italic text-ink-3">, I want </span>
        <span
          className="outline-none focus:text-accent-ink transition-colors"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onUpdate({ iWant: e.currentTarget.innerText })}
        >
          {story.iWant}
        </span>
        <span className="italic text-ink-3"> so that </span>
        <span
          className="outline-none focus:text-accent-ink transition-colors"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onUpdate({ soThat: e.currentTarget.innerText })}
        >
          {story.soThat}
        </span>
        <span className="text-ink-3">.</span>
      </p>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-5 pt-5 border-t border-dashed border-rule grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Left column — AC + Gherkin */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2
                    className="w-3.5 h-3.5"
                    style={{ color: accentClasses.ink }}
                  />
                  <span
                    className="eyebrow"
                    style={{ color: accentClasses.ink }}
                  >
                    Acceptance criteria
                  </span>
                </div>
                <ol className="flex flex-col gap-2.5 m-0 p-0 list-none">
                  {story.acceptanceCriteria.map((ac, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-[15px] leading-[1.5] text-ink"
                    >
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          background: accentClasses.wash,
                          color: accentClasses.ink,
                        }}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                      </span>
                      <span
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const newAC = [...story.acceptanceCriteria];
                          newAC[i] = e.currentTarget.innerText;
                          onUpdate({ acceptanceCriteria: newAC });
                        }}
                        className="outline-none font-body focus:text-accent-ink transition-colors"
                      >
                        {ac}
                      </span>
                    </li>
                  ))}
                </ol>

                {gherkin && (
                  <div className="mt-7">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-3.5 h-3.5 text-ink-3" />
                      <span className="eyebrow">Gherkin scenario</span>
                    </div>
                    <div className="rounded-[12px] border border-rule-soft bg-paper-2 p-4 font-mono text-[12px] leading-[1.65] text-ink-2 overflow-x-auto whitespace-pre-wrap">
                      <div>
                        <span className="text-accent-ink">Feature:</span>{" "}
                        {gherkin.feature}
                      </div>
                      <div className="mt-1">
                        <span className="text-accent-ink">Scenario:</span>{" "}
                        {gherkin.scenario}
                      </div>
                      <div className="mt-2 pl-3 border-l-2 border-rule">
                        <div>
                          <span
                            className="font-semibold"
                            style={{ color: accentClasses.ink }}
                          >
                            Given
                          </span>{" "}
                          {gherkin.given}
                        </div>
                        <div>
                          <span
                            className="font-semibold"
                            style={{ color: accentClasses.ink }}
                          >
                            When
                          </span>{" "}
                          {gherkin.when}
                        </div>
                        <div>
                          <span
                            className="font-semibold"
                            style={{ color: accentClasses.ink }}
                          >
                            Then
                          </span>{" "}
                          {gherkin.then}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right column — tasks */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Code2 className="w-3.5 h-3.5 text-ink-3" />
                  <span className="eyebrow">Developer tasks</span>
                  {tasks.length > 0 && (
                    <span className="font-mono text-[10px] text-ink-3">
                      · {tasks.length} · {totalEstHours}h
                    </span>
                  )}
                </div>

                {tasks.length === 0 ? (
                  <p className="font-serif italic text-[14px] text-ink-3">
                    No engineering tasks scoped yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {tasks.map((task) => {
                      const done = completedTaskIds.has(task.taskId);
                      return (
                        <button
                          key={task.taskId}
                          onClick={() => onToggleTask(task.taskId)}
                          className={`w-full text-left flex items-start gap-3 p-3 rounded-[10px] border transition-colors ${
                            done
                              ? "bg-paper-2 border-transparent text-ink-3"
                              : "bg-paper border-rule-soft text-ink hover:border-accent/40 hover:bg-accent-wash/30"
                          }`}
                        >
                          <span className="pt-0.5 shrink-0">
                            {done ? (
                              <CheckCircle2 className="w-4 h-4 text-accent" />
                            ) : (
                              <Circle className="w-4 h-4 text-ink-3" />
                            )}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="flex items-baseline gap-2 flex-wrap">
                              <span
                                className={`font-serif text-[15px] ${
                                  done ? "line-through" : ""
                                }`}
                              >
                                {task.title}
                              </span>
                              <span
                                className={`font-mono text-[10px] uppercase tracking-[0.1em] px-1.5 py-px rounded-full ${
                                  PRIORITY_CHIP[task.priority]
                                }`}
                              >
                                {task.priority}
                              </span>
                            </span>
                            {task.description && (
                              <span className="block text-[13px] text-ink-2 mt-0.5 leading-snug">
                                {task.description}
                              </span>
                            )}
                            <span className="flex items-center gap-3 mt-1.5 font-mono text-[10px] text-ink-3">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {task.estimatedHours}h
                              </span>
                              {task.dependencies.length > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <Link2 className="w-3 h-3" />
                                  {task.dependencies.length} dep
                                  {task.dependencies.length === 1 ? "" : "s"}
                                </span>
                              )}
                              <span
                                className={`inline-block w-1.5 h-1.5 rounded-full ${
                                  PRIORITY_DOT[task.priority]
                                }`}
                                aria-hidden
                              />
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

export default StoryCard;
