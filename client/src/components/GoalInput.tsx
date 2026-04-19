import { AlertCircle, ArrowRight, Code2, CheckCircle2, Layers, Loader2, Terminal } from "lucide-react";
import { motion } from "motion/react";

interface Props {
  goalInput: string;
  isGenerating: boolean;
  error: string | null;
  onChange: (val: string) => void;
  onGenerate: () => void;
}

const FEATURES = [
  { icon: Code2, label: "Gherkin coverage", desc: "Enterprise-ready specs" },
  { icon: CheckCircle2, label: "Quality checks", desc: "Granular criteria" },
  { icon: Layers, label: "Domain mapping", desc: "Epic-level structure" },
];

export function GoalInput({ goalInput, isGenerating, error, onChange, onGenerate }: Props) {
  return (
    <motion.div
      key="setup"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="mt-20 max-w-2xl mx-auto"
    >
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4 tracking-tight text-gray-900 leading-tight">
          Design your next <span className="text-accent">breakthrough</span>.
        </h2>
        <p className="text-gray-500 text-lg">
          Input your project's primary mission. Our AI will decompose it into epics,
          stories, and technical tasks for your professional workflow.
        </p>
      </div>

      <div className="bg-white border border-border-main rounded-xl p-2 shadow-xl">
        <textarea
          value={goalInput}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g., A real-time microservice for processing regional warehouse inventory updates..."
          className="w-full h-40 bg-gray-50/50 border-none focus:ring-0 p-4 text-gray-900 placeholder-gray-400 resize-none text-lg rounded-lg"
        />
        <div className="flex justify-between items-center px-4 py-3 border-t border-border-main">
          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            <Terminal className="w-3 h-3" />
            {isGenerating ? "Synthesizing data..." : "Ready for input"}
          </div>
          <button
            onClick={onGenerate}
            disabled={isGenerating || !goalInput.trim()}
            className="bg-accent hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition-all flex items-center gap-2 shadow-md active:scale-95"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                PROCESSING
              </>
            ) : (
              <>
                GENERATE REQUIREMENTS
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="mt-16 grid grid-cols-3 gap-8 text-center px-6">
        {FEATURES.map((feature, i) => (
          <div key={i} className="space-y-2 group">
            <div className="w-12 h-12 bg-white border border-border-main rounded-xl flex items-center justify-center mx-auto shadow-sm group-hover:border-accent group-hover:shadow-accent/10 transition-all">
              <feature.icon className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">{feature.label}</h3>
            <p className="text-[11px] text-gray-500">{feature.desc}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
