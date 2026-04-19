import { AnimatePresence, motion, Reorder } from "motion/react";
import {
  CheckCircle2, ChevronDown, Circle, Code2, FileText, GripVertical, Trash2,
} from "lucide-react";
import { UserStory } from "../types";

interface Props {
  story: UserStory;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<UserStory>) => void;
  onDelete: () => void;
  onToggleTask: (taskId: string) => void;
}

export function StoryCard({ story, isExpanded, onToggleExpand, onUpdate, onDelete, onToggleTask }: Props) {
  return (
    <Reorder.Item
      value={story}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative bg-white border border-border-main rounded-xl overflow-hidden hover:border-accent/30 hover:shadow-md transition-all ${
        isExpanded ? "border-accent/40 shadow-sm" : ""
      }`}
    >
      <div className="flex items-center gap-4 p-4">
        <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors">
          <GripVertical className="w-5 h-5" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                story.priority === "high"
                  ? "bg-red-50 text-red-700 border border-red-100"
                  : story.priority === "medium"
                  ? "bg-amber-50 text-amber-700 border border-amber-100"
                  : "bg-blue-50 text-blue-700 border border-blue-100"
              }`}
            >
              {story.priority.toUpperCase()}
            </span>
            <h4
              className="font-bold text-gray-900 group-hover:text-accent transition-colors outline-none focus:text-accent"
              contentEditable
              onBlur={(e) => onUpdate({ title: e.currentTarget.innerText })}
            >
              {story.title}
            </h4>
          </div>
          <p
            className="text-xs text-gray-500 line-clamp-1 outline-none focus:text-gray-700"
            contentEditable
            onBlur={(e) => onUpdate({ description: e.currentTarget.innerText })}
          >
            {story.description}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onDelete}
            className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleExpand}
            className={`p-2 rounded-lg bg-gray-50 hover:bg-accent-light transition-all ${
              isExpanded ? "rotate-180 bg-accent-light text-accent" : "text-gray-400"
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border-main bg-gray-50/50"
          >
            <div className="p-8 grid grid-cols-2 gap-12">
              <div className="space-y-8">
                <div>
                  <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                    Acceptance Criteria
                  </h5>
                  <ul className="space-y-2.5">
                    {story.acceptanceCriteria.map((ac, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                        <span
                          contentEditable
                          onBlur={(e) => {
                            const newAC = [...story.acceptanceCriteria];
                            newAC[i] = e.currentTarget.innerText;
                            onUpdate({ acceptanceCriteria: newAC });
                          }}
                          className="outline-none focus:text-gray-900"
                        >
                          {ac}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    Gherkin Specifications
                  </h5>
                  <pre
                    contentEditable
                    onBlur={(e) => onUpdate({ gherkin: e.currentTarget.innerText })}
                    className="p-5 bg-white border border-border-main rounded-xl text-xs font-mono text-gray-600 overflow-x-auto shadow-inner outline-none focus:border-accent/40 leading-relaxed"
                  >
                    {story.gherkin}
                  </pre>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-gray-400" />
                    Developer Tasks
                  </h5>
                  <div className="space-y-1.5">
                    {story.tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => onToggleTask(task.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all border ${
                          task.status === "done"
                            ? "bg-gray-50 border-transparent text-gray-400"
                            : "bg-white border-border-main text-gray-700 hover:border-accent/30"
                        }`}
                      >
                        {task.status === "done" ? (
                          <CheckCircle2 className="w-4 h-4 text-accent" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300" />
                        )}
                        <span className={`text-sm ${task.status === "done" ? "line-through" : ""}`}>
                          {task.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}
