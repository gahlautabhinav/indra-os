import { create } from "zustand";
import type { Agent } from "@indra/types";

interface AgentState {
  agents: Map<string, Agent>;
  setAgents: (agents: Agent[]) => void;
  updateAgent: (id: string, patch: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: new Map(),

  setAgents: (agents) =>
    set({ agents: new Map(agents.map((a) => [a.id, a])) }),

  updateAgent: (id, patch) =>
    set((s) => {
      const existing = s.agents.get(id);
      if (!existing) return s;
      const next = new Map(s.agents);
      next.set(id, { ...existing, ...patch });
      return { agents: next };
    }),

  removeAgent: (id) =>
    set((s) => {
      const next = new Map(s.agents);
      next.delete(id);
      return { agents: next };
    }),
}));
