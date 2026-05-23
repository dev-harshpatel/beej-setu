import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthState, AuthTokens, User } from "@/types/auth.types";
import { LOCAL_STORAGE_KEYS } from "@/constants/app.constants";

interface AuthStoreState extends AuthState {
  _hasHydrated: boolean;
}

interface AuthActions {
  setAuth: (user: User, tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  setLoading: (isLoading: boolean) => void;
  clearAuth: () => void;
  setHasHydrated: (value: boolean) => void;
}

const initialState: AuthStoreState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  _hasHydrated: false,
};

export const useAuthStore = create<AuthStoreState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,

      setAuth: (user, tokens) => {
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, tokens.accessToken);
          localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
        }
        set({ user, tokens, isAuthenticated: true, isLoading: false });
      },

      setUser: (user) => set({ user }),

      setLoading: (isLoading) => set({ isLoading }),

      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
          localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
        }
        set(initialState);
      },

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: LOCAL_STORAGE_KEYS.USER,
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
