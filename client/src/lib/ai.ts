import { GoogleGenAI, Type } from "@google/genai";

import Anthropic from "@anthropic-ai/sdk";

// export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const ai = new Anthropic()



const client = new Anthropic();


// ! Fix schema to match claude response format, and
// ! ensure it is properly validated in the backend before 
// ! being sent to the frontend.

export const GENERATION_SCHEMA = {
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
                  items: { type: Type.STRING },
                },
                gherkin: { type: Type.STRING },
                tasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      status: { type: Type.STRING, enum: ["todo", "done"] },
                    },
                    required: ["id", "title", "status"],
                  },
                },
                priority: { type: Type.STRING, enum: ["low", "medium", "high"] },
                order: { type: Type.INTEGER },
              },
              required: [
                "id", "title", "description", "acceptanceCriteria",
                "gherkin", "tasks", "priority", "order",
              ],
            },
          },
        },
        required: ["id", "title", "description", "order", "stories"],
      },
    },
  },
  required: ["goal", "epics"],
};

export const SYSTEM_INSTRUCTION = `You are StoryMorph, an elite technical PM and systems architect.
You transform abstract project goals into production-ready backlogs.
Generate realistic UUIDs for IDs.
Use professional Gherkin syntax.
Tasks should be technical and actionable.
Ensure Epics represent high-level architectural domains.
User stories must follow the 'As a [role], I want [action], so that [value]' format.`;
