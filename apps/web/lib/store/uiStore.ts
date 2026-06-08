import { create } from "zustand";
import type { DomainId } from "@indra/types";

interface UIState {
  sigilBarExpanded: boolean;
  commandEtherOpen: boolean;
  activeDomain: DomainId;
  activeModule: string | null;

  toggleSigilBar: () => void;
  openCommandEther: () => void;
  closeCommandEther: () => void;
  toggleCommandEther: () => void;
  setActiveDomain: (domain: DomainId) => void;
  setActiveModule: (module: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sigilBarExpanded: true,
  commandEtherOpen: false,
  activeDomain: "indra",
  activeModule: null,

  toggleSigilBar: () => set((s) => ({ sigilBarExpanded: !s.sigilBarExpanded })),
  openCommandEther: () => set({ commandEtherOpen: true }),
  closeCommandEther: () => set({ commandEtherOpen: false }),
  toggleCommandEther: () => set((s) => ({ commandEtherOpen: !s.commandEtherOpen })),
  setActiveDomain: (domain) => set({ activeDomain: domain }),
  setActiveModule: (module) => set({ activeModule: module }),
}));
