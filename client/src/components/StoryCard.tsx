import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Code2,
  FileText,
  GripVertical,
  Link2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { GherkinScenario, Task, UserStory } from "../lib/ai";
import { EpicColor, PRIORITY_DOT } from "../lib/palette";
import { newId } from "../lib/ids";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  scenarioAdded,
  scenarioDeleted,
  scenarioUpdated,
  selectScenariosForStory,
  selectTasksForStory,
  storyDeleted,
  storyUpdated,
  taskAdded,
  taskDeleted,
  taskToggled,
  taskUpdated,
  type EditableTask,
} from "../store/slices/blueprintSlice";
import EditableText from "./EditableText";
import PriorityChip from "./PriorityChip";

interface Props {
  story: UserStory;
  index: number;
  accentClasses: EpicColor;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function newScenario(story: UserStory): GherkinScenario {
  return {
    scenarioId: newId(),
    storyId: story.storyId,
    feature: story.title,
    scenario: "New scenario",
    given: "",
    when: "",
    then: "",
  };
}

export function newTask(storyId: string): Task {
  return {
    taskId: newId(),
    storyId,
    title: "New task",
    description: "",
    estimatedHours: 2,
    priority: "Medium",
    dependencies: [],
  };
}

const ADD_BTN =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-rule text-ink-3 hover:text-accent-ink hover:border-accent/40 hover:bg-accent-wash/40 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors";

const HOVER_DELETE =
  "p-1 rounded-md text-ink-3 hover:text-accent-ink hover:bg-accent-wash/60 opacity-0 group-hover/row:opacity-100 focus:opacity-100 transition-opacity";

export function StoryCard({ story, index, accentClasses, isExpanded, onToggleExpand }: Props) {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector((s) => selectTasksForStory(s, story.storyId));
  const gherkins = useAppSelector((s) => selectScenariosForStory(s, story.storyId));
  const dragControls = useDragControls();

  const update = (changes: Partial<UserStory>) => dispatch(storyUpdated({ id: story.storyId, changes }));

  const setCriterion = (i: number, text: string) => {
    const acceptanceCriteria = story.acceptanceCriteria.map((c, idx) => (idx === i ? text : c));
    update({ acceptanceCriteria });
  };
  const addCriterion = () => update({ acceptanceCriteria: [...story.acceptanceCriteria, ""] });
  const removeCriterion = (i: number) =>
    update({ acceptanceCriteria: story.acceptanceCriteria.filter((_, idx) => idx !== i) });

  const totalEstHours = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
  const completedHere = tasks.filter((t) => t.completed).length;

  return (
    <Reorder.Item
      value={story}
      dragListener={false}
      dragControls={dragControls}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group rounded-2xl border transition-colors ${
        isExpanded
          ? "border-accent/35 bg-paper shadow-[0_10px_28px_-22px_oklch(0.3_0.04_50/.5)]"
          : "border-rule-soft bg-paper hover:border-accent/30"
      }`}
    >
      {/* Header — click anywhere that isn't an editable field to expand/collapse. */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          // Only react to keys pressed on the header itself, never inside a field.
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleExpand();
          }
        }}
        className="flex items-start justify-between gap-4 px-5 py-4 cursor-pointer"
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              dragControls.start(e);
            }}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab active:cursor-grabbing text-ink-3 hover:text-ink mt-1 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-[11px] tracking-[0.1em] text-ink-3">
                S-{String(index + 1).padStart(2, "0")}
              </span>
              <PriorityChip value={story.priority} onChange={(priority) => update({ priority })} />
              {tasks.length > 0 && (
                <span className="font-mono text-[10px] text-ink-3 inline-flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {totalEstHours}h · {completedHere}/{tasks.length}
                </span>
              )}
            </div>

            <EditableText
              as="h4"
              value={story.title}
              required
              onCommit={(title) => update({ title })}
              aria-label="Story title"
              className="font-serif text-[20px] font-medium tracking-[-0.01em] leading-snug text-ink"
            />

            <p className="font-ui text-[14px] leading-[1.55] text-ink-2 mt-1.5">
              <span className="italic text-ink-3">As </span>
              <EditableText value={story.asA} onCommit={(asA) => update({ asA })} aria-label="As a" placeholder="who" />
              <span className="italic text-ink-3">, I want </span>
              <EditableText value={story.iWant} onCommit={(iWant) => update({ iWant })} aria-label="I want" placeholder="what" />
              <span className="italic text-ink-3"> so that </span>
              <EditableText value={story.soThat} onCommit={(soThat) => update({ soThat })} aria-label="So that" placeholder="why" />
              <span className="text-ink-3">.</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dispatch(storyDeleted(story.storyId));
            }}
            className="p-1.5 text-ink-3 hover:text-accent-ink opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete story"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ChevronRight
            className={`w-4 h-4 text-ink-3 transition-transform mt-1 ${
              isExpanded ? `rotate-90 ${accentClasses.classes.text}` : ""
            }`}
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-5 pb-5"
          >
            <div className="pt-4 border-t border-dashed border-rule grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left column — acceptance criteria + Gherkin */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: accentClasses.ink }} />
                  <span className="eyebrow" style={{ color: accentClasses.ink }}>
                    Acceptance criteria
                  </span>
                </div>
                <ol className="flex flex-col gap-2 m-0 p-0 list-none">
                  {story.acceptanceCriteria.map((ac, i) => (
                    <li key={i} className="group/row flex items-start gap-3 text-[15px] leading-[1.5] text-ink">
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: accentClasses.wash, color: accentClasses.ink }}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                      </span>
                      <EditableText
                        value={ac}
                        onCommit={(text) => setCriterion(i, text)}
                        placeholder="Describe a testable outcome…"
                        aria-label={`Acceptance criterion ${i + 1}`}
                        className="flex-1 font-body"
                      />
                      <button
                        type="button"
                        onClick={() => removeCriterion(i)}
                        className={HOVER_DELETE}
                        aria-label={`Remove acceptance criterion ${i + 1}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ol>
                <button type="button" onClick={addCriterion} className={`${ADD_BTN} mt-3`}>
                  <Plus className="w-3 h-3" />
                  Add criterion
                </button>

                <div className="mt-7 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-ink-3" />
                    <span className="eyebrow">Gherkin scenarios</span>
                  </div>
                  {gherkins.map((g) => (
                    <ScenarioCard
                      key={g.scenarioId}
                      scenario={g}
                      accent={accentClasses}
                      onChange={(changes) => dispatch(scenarioUpdated({ id: g.scenarioId, changes }))}
                      onDelete={() => dispatch(scenarioDeleted(g.scenarioId))}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => dispatch(scenarioAdded(newScenario(story)))}
                    className={`${ADD_BTN} self-start`}
                  >
                    <Plus className="w-3 h-3" />
                    Add scenario
                  </button>
                </div>
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

                <div className="flex flex-col gap-1.5">
                  {tasks.length === 0 && (
                    <p className="font-serif italic text-[14px] text-ink-3 m-0 mb-1">No engineering tasks scoped yet.</p>
                  )}
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.taskId}
                      task={task}
                      onToggle={() => dispatch(taskToggled(task.taskId))}
                      onChange={(changes) => dispatch(taskUpdated({ id: task.taskId, changes }))}
                      onDelete={() => dispatch(taskDeleted(task.taskId))}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => dispatch(taskAdded(newTask(story.storyId)))}
                    className={`${ADD_BTN} self-start mt-1`}
                  >
                    <Plus className="w-3 h-3" />
                    Add task
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

// ---- Gherkin scenario ---------------------------------------------------------

function ScenarioCard({
  scenario: g,
  accent,
  onChange,
  onDelete,
}: {
  scenario: GherkinScenario;
  accent: EpicColor;
  onChange: (changes: Partial<GherkinScenario>) => void;
  onDelete: () => void;
}) {
  const step = (label: "Given" | "When" | "Then", key: "given" | "when" | "then") => (
    <div className="flex gap-2">
      <span className="font-semibold shrink-0 w-11" style={{ color: accent.ink }}>
        {label}
      </span>
      <EditableText
        value={g[key]}
        onCommit={(v) => onChange({ [key]: v })}
        multiline
        placeholder="…"
        aria-label={`${label} step`}
        className="flex-1"
      />
    </div>
  );

  return (
    <div className="group/row relative rounded-xl border border-rule-soft bg-paper-2 p-4 pr-9 font-mono text-[12px] leading-[1.65] text-ink-2">
      <div className="flex gap-2">
        <span className="text-accent-ink shrink-0">Feature:</span>
        <EditableText value={g.feature} onCommit={(feature) => onChange({ feature })} placeholder="Feature name" aria-label="Feature" className="flex-1" />
      </div>
      <div className="flex gap-2 mt-1">
        <span className="text-accent-ink shrink-0">Scenario:</span>
        <EditableText value={g.scenario} onCommit={(scenario) => onChange({ scenario })} placeholder="Scenario name" aria-label="Scenario" className="flex-1" />
      </div>
      <div className="mt-2 pl-3 border-l-2 border-rule flex flex-col gap-0.5">
        {step("Given", "given")}
        {step("When", "when")}
        {step("Then", "then")}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className={`${HOVER_DELETE} absolute top-2 right-2`}
        aria-label="Delete scenario"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ---- Developer task -----------------------------------------------------------

function TaskRow({
  task,
  onToggle,
  onChange,
  onDelete,
}: {
  task: EditableTask;
  onToggle: () => void;
  onChange: (changes: Partial<EditableTask>) => void;
  onDelete: () => void;
}) {
  const done = task.completed;

  const commitHours = (raw: string) => {
    const n = Number.parseFloat(raw.replace(/[^\d.]/g, ""));
    if (Number.isFinite(n) && n >= 0) onChange({ estimatedHours: n });
  };

  return (
    <div
      className={`group/row flex items-start gap-3 p-3 rounded-[10px] border transition-colors ${
        done
          ? "bg-paper-2 border-transparent text-ink-3"
          : "bg-paper border-rule-soft text-ink hover:border-accent/40"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
        className="pt-0.5 shrink-0 rounded-full hover:scale-110 transition-transform"
      >
        {done ? <CheckCircle2 className="w-4 h-4 text-accent" /> : <Circle className="w-4 h-4 text-ink-3 hover:text-accent" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <EditableText
            value={task.title}
            required
            onCommit={(title) => onChange({ title })}
            aria-label="Task title"
            className={`font-serif text-[15px] ${done ? "line-through" : ""}`}
          />
          <PriorityChip value={task.priority} onChange={(priority) => onChange({ priority })} className="text-[10px] px-1.5 py-px" />
        </div>
        <EditableText
          as="span"
          value={task.description}
          onCommit={(description) => onChange({ description })}
          multiline
          placeholder="Add a description…"
          aria-label="Task description"
          className="block text-[13px] text-ink-2 mt-0.5 leading-snug"
        />
        <span className="flex items-center gap-3 mt-1.5 font-mono text-[10px] text-ink-3">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <EditableText
              value={String(task.estimatedHours)}
              onCommit={commitHours}
              aria-label="Estimated hours"
              className="min-w-[1.5ch] text-center"
            />
            h
          </span>
          {task.dependencies.length > 0 && (
            <span className="inline-flex items-center gap-1" title={task.dependencies.join(", ")}>
              <Link2 className="w-3 h-3" />
              {task.dependencies.length} dep{task.dependencies.length === 1 ? "" : "s"}
            </span>
          )}
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} aria-hidden />
        </span>
      </div>

      <button type="button" onClick={onDelete} className={`${HOVER_DELETE} shrink-0`} aria-label={`Delete task "${task.title}"`}>
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default StoryCard;
