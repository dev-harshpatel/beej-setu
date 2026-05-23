import { create } from "zustand";

interface DashboardState {
  pendingOrdersCount: number;
  setPendingOrdersCount: (count: number) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  pendingOrdersCount: 0,
  setPendingOrdersCount: (count) => set({ pendingOrdersCount: count }),
}));
