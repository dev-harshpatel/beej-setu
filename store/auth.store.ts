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

// Captured inside the state factory so onRehydrateStorage can call it
// even when the rehydrated state is undefined (empty localStorage on first login).
let _markHydrated: (() => void) | undefined;

export const useAuthStore = create<AuthStoreState & AuthActions>()(
  persist(
    (set) => {
      _markHydrated = () => set({ _hasHydrated: true });

      return {
        ...initialState,

        setAuth: (user, tokens) => {
          if (typeof window !== "undefined") {
            localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, tokens.accessToken);
            localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
          }
          set({ user, tokens, isAuthenticated: true, isLoading: false, _hasHydrated: true });
        },

        setUser: (user) => set({ user }),

        setLoading: (isLoading) => set({ isLoading }),

        clearAuth: () => {
          if (typeof window !== "undefined") {
            localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
            localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
          }
          set({ ...initialState, _hasHydrated: true });
        },

        setHasHydrated: (value) => set({ _hasHydrated: value }),
      };
    },
    {
      name: LOCAL_STORAGE_KEYS.USER,
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // state is the value restored from localStorage.
        // On first login localStorage is empty, so state is undefined —
        // state?.setHasHydrated(true) would be a silent no-op and the
        // sidebar skeleton would stay visible forever.
        // _markHydrated is always available since it's set synchronously
        // during store creation, before this callback ever fires.
        if (state) {
          state.setHasHydrated(true);
        } else {
          _markHydrated?.();
        }
      },
    }
  )
);
