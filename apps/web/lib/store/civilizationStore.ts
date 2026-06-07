import { create } from "zustand";

interface DevaHealth {
  id: string;
  name: string;
  domain: string;
  status: "healthy" | "degraded" | "critical" | "unknown";
  lastEventAt: string | null;
}

interface CivilizationState {
  devas: DevaHealth[];
  overallHealth: number;
  setDevas: (devas: DevaHealth[]) => void;
  updateDeva: (id: string, patch: Partial<DevaHealth>) => void;
  computeHealth: () => void;
}

export const useCivilizationStore = create<CivilizationState>((set, get) => ({
  devas: [],
  overallHealth: 100,

  setDevas: (devas) => {
    set({ devas });
    get().computeHealth();
  },

  updateDeva: (id, patch) => {
    set((s) => ({
      devas: s.devas.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
    get().computeHealth();
  },

  computeHealth: () => {
    const { devas } = get();
    if (devas.length === 0) {
      set({ overallHealth: 100 });
      return;
    }
    const scores = devas.map((d) =>
      d.status === "healthy" ? 100 : d.status === "degraded" ? 60 : d.status === "critical" ? 0 : 50
    );
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    set({ overallHealth: Math.round(avg) });
  },
}));
