import { create } from "zustand";

interface LoaderState {
  isLoading: boolean;
  message: string | null;
  show: (message?: string) => void;
  hide: () => void;
}

export const useLoaderStore = create<LoaderState>((set) => ({
  isLoading: false,
  message: null,
  show: (message) => set({ isLoading: true, message: message ?? null }),
  hide: () => set({ isLoading: false, message: null }),
}));
