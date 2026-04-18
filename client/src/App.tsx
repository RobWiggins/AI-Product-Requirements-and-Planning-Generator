// import { useEffect } from "react";
// import { useAppDispatch, useAppSelector } from "./hooks";
// import { fetchItems } from "./store/slices/exampleSlice";

// function App() {
//   const dispatch = useAppDispatch();
//   const { items, status, error } = useAppSelector((state) => state.items);

//   useEffect(() => {
//     if (status === "idle") dispatch(fetchItems());
//   }, [status, dispatch]);

//   return (
//     <main>
//       <h1>AI Product Requirements Generator</h1>
//       {status === "loading" && <p>Loading...</p>}
//       {status === "failed" && <p>Error: {error}</p>}
//       <ul>
//         {items.map((item) => (
//           <li key={item.id}>{item.name}</li>
//         ))}
//       </ul>
//     </main>
//   );
// }

// export default App;



import { useState, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Send, 
  Trash2, 
  Edit2, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  GripVertical, 
  Code2, 
  Terminal,
  Layers,
  FileText,
  AlertCircle,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { ProjectBlueprint, Epic, UserStory, Task, Priority } from './types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GENERATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    goal: { type: Type.STRING },
    epics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          order: { type: Type.INTEGER },
          stories: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                acceptanceCriteria: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                gherkin: { type: Type.STRING },
                tasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      status: { type: Type.STRING, enum: ['todo', 'done'] }
                    },
                    required: ['id', 'title', 'status']
                  }
                },
                priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                order: { type: Type.INTEGER }
              },
              required: ['id', 'title', 'description', 'acceptanceCriteria', 'gherkin', 'tasks', 'priority', 'order']
            }
          }
        },
        required: ['id', 'title', 'description', 'order', 'stories']
      }
    }
  },
  required: ['goal', 'epics']
};

const SYSTEM_INSTRUCTION = `You are StoryMorph, an elite technical PM and systems architect. 
You transform abstract project goals into production-ready backlogs.
Generate realistic UUIDs for IDs.
Use professional Gherkin syntax.
Tasks should be technical and actionable.
Ensure Epics represent high-level architectural domains.
User stories must follow the 'As a [role], I want [action], so that [value]' format.`;

export default function App() {
  const [goalInput, setGoalInput] = useState('');
  const [blueprint, setBlueprint] = useState<ProjectBlueprint | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeEpicId, setActiveEpicId] = useState<string | null>(null);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);

  const generateBlueprint = async () => {
    if (!goalInput.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Project Goal: ${goalInput}\n\nGenerate a full backlog of requirements including epics, stories, ACs, tasks, and Gherkin.`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: GENERATION_SCHEMA
        }
      });

      const text = result.text;
      if (!text) throw new Error("No response from AI");
      const data = JSON.parse(text) as ProjectBlueprint;
      setBlueprint(data);
      if (data.epics.length > 0) {
        setActiveEpicId(data.epics[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate blueprint. Please verify your Gemini API key and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateStory = (epicId: string, storyId: string, updates: Partial<UserStory>) => {
    setBlueprint(prev => {
      if (!prev) return null;
      return {
        ...prev,
        epics: prev.epics.map(epic => {
          if (epic.id !== epicId) return epic;
          return {
            ...epic,
            stories: epic.stories.map(story => {
              if (story.id !== storyId) return story;
              return { ...story, ...updates };
            })
          };
        })
      };
    });
  };

  const toggleTask = (epicId: string, storyId: string, taskId: string) => {
    setBlueprint(prev => {
      if (!prev) return null;
      return {
        ...prev,
        epics: prev.epics.map(epic => {
          if (epic.id !== epicId) return epic;
          return {
            ...epic,
            stories: epic.stories.map(story => {
              if (story.id !== storyId) return story;
              return {
                ...story,
                tasks: story.tasks.map(task => {
                  if (task.id !== taskId) return task;
                  return { ...task, status: task.status === 'todo' ? 'done' : 'todo' };
                })
              };
            })
          };
        })
      };
    });
  };

  const addEpic = () => {
    const newEpic: Epic = {
      id: crypto.randomUUID(),
      title: 'New Epic',
      description: 'Describe the high-level objective of this domain...',
      order: (blueprint?.epics.length || 0) + 1,
      stories: []
    };
    setBlueprint(prev => prev ? { ...prev, epics: [...prev.epics, newEpic] } : null);
    setActiveEpicId(newEpic.id);
  };

  const addStory = (epicId: string) => {
    const newStory: UserStory = {
      id: crypto.randomUUID(),
      title: 'New User Story',
      description: 'As a... I want... So that...',
      acceptanceCriteria: ['Requirement 1'],
      gherkin: 'Feature: New Feature\n  Scenario: New Scenario\n    Given ...\n    When ...\n    Then ...',
      tasks: [{ id: crypto.randomUUID(), title: 'Initial setup', status: 'todo' }],
      priority: 'medium',
      order: 1
    };
    setBlueprint(prev => {
      if (!prev) return null;
      return {
        ...prev,
        epics: prev.epics.map(e => e.id === epicId ? { ...e, stories: [newStory, ...e.stories] } : e)
      };
    });
    setExpandedStoryId(newStory.id);
  };

  const deleteEpic = (epicId: string) => {
    setBlueprint(prev => {
      if (!prev) return null;
      const filtered = prev.epics.filter(e => e.id !== epicId);
      if (activeEpicId === epicId) {
        setActiveEpicId(filtered[0]?.id || null);
      }
      return { ...prev, epics: filtered };
    });
  };

  const deleteStory = (epicId: string, storyId: string) => {
    setBlueprint(prev => {
      if (!prev) return null;
      return {
        ...prev,
        epics: prev.epics.map(e => e.id === epicId ? { ...e, stories: e.stories.filter(s => s.id !== storyId) } : e)
      };
    });
  };

  const activeEpic = useMemo(() => {
    return blueprint?.epics.find(e => e.id === activeEpicId);
  }, [blueprint, activeEpicId]);

  return (
    <div className="min-h-screen bg-bg-main text-gray-900 font-sans selection:bg-accent/20">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border-main bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
            <Layers className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              STORYFLOW AI
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-accent font-bold">
              Professional // Requirements Architect
            </p>
          </div>
        </div>
        
        {blueprint && (
          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top duration-500">
            <button 
              onClick={() => {
                setBlueprint(null);
                setGoalInput('');
              }}
              className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors flex items-center gap-2 group"
            >
              <Trash2 className="w-4 h-4" />
              CLEAR PROJECT
            </button>
          </div>
        )}
      </header>

      <main className="relative z-10 max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {!blueprint ? (
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
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="e.g., A real-time microservice for processing regional warehouse inventory updates..."
                  className="w-full h-40 bg-gray-50/50 border-none focus:ring-0 p-4 text-gray-900 placeholder-gray-400 resize-none text-lg rounded-lg"
                />
                <div className="flex justify-between items-center px-4 py-3 border-t border-border-main">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <Terminal className="w-3 h-3" />
                    {isGenerating ? 'Synthesizing data...' : 'Ready for input'}
                  </div>
                  <button
                    onClick={generateBlueprint}
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
                {[
                  { icon: Code2, label: 'Gherkin coverage', desc: 'Enterprise-ready specs' },
                  { icon: CheckCircle2, label: 'Quality checks', desc: 'Granular criteria' },
                  { icon: Layers, label: 'Domain mapping', desc: 'Epic-level structure' },
                ].map((feature, i) => (
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
          ) : (
            <motion.div 
              key="blueprint" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-8 h-[calc(100vh-140px)]"
            >
              {/* Sidebar */}
              <aside className="w-1/4 flex flex-col gap-4">
                <div className="p-4 border border-border-main bg-white rounded-xl flex-1 flex flex-col min-h-0 shadow-sm">
                  <h3 className="text-[11px] font-bold text-gray-400 mb-4 tracking-[0.1em] uppercase shrink-0">
                    Epics / Architecture
                  </h3>
                  <div className="space-y-1 overflow-y-auto custom-scrollbar pr-2 mb-4">
                    {blueprint.epics.map((epic) => (
                      <div key={epic.id} className="relative group/epic">
                        <button
                          onClick={() => setActiveEpicId(epic.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border flex items-center justify-between ${
                            activeEpicId === epic.id 
                              ? 'bg-accent-light border-accent/20 text-accent font-semibold' 
                              : 'bg-transparent border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-[11px] font-mono ${activeEpicId === epic.id ? 'text-accent' : 'text-gray-400'}`}>
                              {String(epic.order).padStart(2, '0')}
                            </span>
                            <span className="text-sm truncate pr-4">{epic.title}</span>
                          </div>
                          <ChevronRight className={`w-4 h-4 transition-transform ${activeEpicId === epic.id ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0 group-hover/epic:opacity-100'}`} />
                        </button>
                        {activeEpicId !== epic.id && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteEpic(epic.id); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover/epic:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={addEpic}
                    className="w-full py-2 border border-dashed border-border-main text-gray-400 hover:text-accent hover:border-accent/50 transition-all rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Plus className="w-3 h-3" />
                    NEW EPIC
                  </button>
                </div>

                <div className="p-5 border border-border-main bg-white rounded-xl overflow-hidden relative shrink-0 shadow-sm">
                  <h4 className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Global Completion</h4>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent transition-all duration-1000" 
                      style={{ 
                        width: `${(blueprint.epics.reduce((acc, e) => acc + e.stories.reduce((sAcc, s) => sAcc + (s.tasks.filter(t => t.status === 'done').length / (Math.max(1, s.tasks.length))), 0), 0) / Math.max(1, blueprint.epics.reduce((acc, e) => acc + e.stories.length, 0))) * 100}%` 
                      }} 
                    />
                  </div>
                </div>
              </aside>

              {/* Main Canvas */}
              <section className="flex-1 flex flex-col gap-6 overflow-hidden">
                {activeEpic ? (
                  <div className="flex flex-col h-full gap-6">
                    <div className="animate-in fade-in slide-in-from-left duration-500 shrink-0 flex items-start justify-between bg-white p-6 rounded-xl border border-border-main shadow-sm">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-accent-light text-accent text-[11px] font-bold px-2 py-0.5 rounded border border-accent/10">
                            EPIC {activeEpic.order}
                          </span>
                          <h2 className="text-2xl font-bold text-gray-900 tracking-tight" contentEditable onBlur={(e) => {
                            setBlueprint(prev => prev ? { ...prev, epics: prev.epics.map(ep => ep.id === activeEpic.id ? { ...ep, title: e.currentTarget.innerText } : ep) } : null);
                          }}>{activeEpic.title}</h2>
                        </div>
                        <p className="text-gray-500 text-sm max-w-2xl" contentEditable onBlur={(e) => {
                          setBlueprint(prev => prev ? { ...prev, epics: prev.epics.map(ep => ep.id === activeEpic.id ? { ...ep, description: e.currentTarget.innerText } : ep) } : null);
                        }}>{activeEpic.description}</p>
                      </div>
                      <button 
                        onClick={() => addStory(activeEpic.id)}
                        className="bg-accent hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        ADD STORY
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                      <Reorder.Group 
                        axis="y" 
                        values={activeEpic.stories} 
                        onReorder={(newStories) => {
                          setBlueprint(prev => {
                            if(!prev) return null;
                            return {
                              ...prev,
                              epics: prev.epics.map(e => e.id === activeEpicId ? { ...e, stories: newStories } : e)
                            };
                          });
                        }}
                        className="space-y-3"
                      >
                        {activeEpic.stories.map((story) => (
                          <Reorder.Item
                            key={story.id}
                            value={story}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`group relative bg-white border border-border-main rounded-xl overflow-hidden hover:border-accent/30 hover:shadow-md transition-all ${expandedStoryId === story.id ? 'border-accent/40 shadow-sm' : ''}`}
                          >
                            <div className="flex items-center gap-4 p-4">
                              <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors">
                                <GripVertical className="w-5 h-5" />
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    story.priority === 'high' ? 'bg-red-50 text-red-700 border border-red-100' :
                                    story.priority === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                    'bg-blue-50 text-blue-700 border border-blue-100'
                                  }`}>
                                    {story.priority.toUpperCase()}
                                  </span>
                                  <h4 className="font-bold text-gray-900 group-hover:text-accent transition-colors outline-none focus:text-accent" contentEditable onBlur={(e) => updateStory(activeEpic.id, story.id, { title: e.currentTarget.innerText })}>{story.title}</h4>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-1 outline-none focus:text-gray-700" contentEditable onBlur={(e) => updateStory(activeEpic.id, story.id, { description: e.currentTarget.innerText })}>{story.description}</p>
                              </div>

                              <div className="flex items-center gap-4">
                                <button 
                                  onClick={() => deleteStory(activeEpic.id, story.id)}
                                  className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setExpandedStoryId(expandedStoryId === story.id ? null : story.id)}
                                  className={`p-2 rounded-lg bg-gray-50 hover:bg-accent-light transition-all ${expandedStoryId === story.id ? 'rotate-180 bg-accent-light text-accent' : 'text-gray-400'}`}
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <AnimatePresence>
                              {expandedStoryId === story.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
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
                                              <span contentEditable onBlur={(e) => {
                                                const newAC = [...story.acceptanceCriteria];
                                                newAC[i] = e.currentTarget.innerText;
                                                updateStory(activeEpic.id, story.id, { acceptanceCriteria: newAC });
                                              }} className="outline-none focus:text-gray-900">{ac}</span>
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
                                          onBlur={(e) => updateStory(activeEpic.id, story.id, { gherkin: e.currentTarget.innerText })}
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
                                              onClick={() => toggleTask(activeEpic.id, story.id, task.id)}
                                              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all border ${
                                                task.status === 'done' 
                                                ? 'bg-gray-50 border-transparent text-gray-400' 
                                                : 'bg-white border-border-main text-gray-700 hover:border-accent/30'
                                              }`}
                                            >
                                              {task.status === 'done' ? (
                                                <CheckCircle2 className="w-4 h-4 text-accent" />
                                              ) : (
                                                <Circle className="w-4 h-4 text-gray-300" />
                                              )}
                                              <span className={`text-sm ${task.status === 'done' ? 'line-through' : ''}`}>
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
                        ))}
                      </Reorder.Group>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-700 font-mono italic">
                    Select an architecture domain to begin...
                  </div>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="fixed bottom-0 inset-x-0 border-t border-border-main bg-white h-12 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-6 text-[11px] font-bold text-gray-400 uppercase tracking-wide">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
            {isGenerating ? 'PROCESSING' : 'SYSTEM_CONNECTED'}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-accent/60">NODE:</span> US-EAST-1
          </div>
        </div>
        <div className="text-[11px] font-bold text-gray-300 tracking-wider uppercase">
          StoryFlow AI v1.2.0-stable
        </div>
      </footer>

      {/* Custom Styles for Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1F1F1F;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #2A2A2A;
        }
      `}</style>
    </div>
  );
}
