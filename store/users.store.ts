import { create } from "zustand";
import type { ProfileRow } from "@/types/database.types";

interface UsersState {
  users: ProfileRow[];
  loading: boolean;
  initialized: boolean;
  setUsers: (users: ProfileRow[]) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  upsertUser: (user: ProfileRow) => void;
  removeUser: (id: string) => void;
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  loading: false,
  initialized: false,
  setUsers: (users) => set({ users }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  upsertUser: (user) =>
    set((state) => {
      const exists = state.users.some((u) => u.id === user.id);
      return {
        users: exists
          ? state.users.map((u) => (u.id === user.id ? user : u))
          : [user, ...state.users],
      };
    }),
  removeUser: (id) =>
    set((state) => ({ users: state.users.filter((u) => u.id !== id) })),
}));
