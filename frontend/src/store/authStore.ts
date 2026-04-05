import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  last_login?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  cryptoKey: CryptoKey | null;
  kdfSalt: string | null;
  isLocked: boolean;
  /** True while we're attempting auto-refresh on page load */
  isInitializing: boolean;

  /** Full login: user is authenticated AND key is derived */
  setAuth: (user: User, token: string, kdfSalt: string, key: CryptoKey) => void;
  /** Page refresh: session restored from cookie but key must be re-derived */
  setUserFromRefresh: (user: User, token: string, kdfSalt: string) => void;
  /** Update access token after a silent refresh */
  setAccessToken: (token: string) => void;
  /**
   * Lock: drop the in-memory CryptoKey and access token.
   * kdfSalt is kept so re-derivation is possible on unlock.
   * Note: JS has no explicit memory-zeroing API; setting to null removes
   * our reference and lets the GC/engine reclaim the key material.
   */
  lock: () => void;
  /** Unlock: restore access token + derived key */
  unlock: (token: string, key: CryptoKey) => void;
  /**
   * Full sign-out: clear all sensitive material including kdfSalt.
   * After this call no key material remains reachable from this store.
   */
  logout: () => void;
  setInitializing: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  cryptoKey: null,
  kdfSalt: null,
  isLocked: false,
  isInitializing: true,

  setAuth: (user, token, kdfSalt, key) =>
    set({ user, accessToken: token, kdfSalt, cryptoKey: key, isLocked: false, isInitializing: false }),

  setUserFromRefresh: (user, token, kdfSalt) =>
    set({ user, accessToken: token, kdfSalt, cryptoKey: null, isLocked: true, isInitializing: false }),

  setAccessToken: (token) => set({ accessToken: token }),

  lock: () => set({ cryptoKey: null, accessToken: null, isLocked: true }),

  unlock: (token, key) => set({ accessToken: token, cryptoKey: key, isLocked: false }),

  logout: () =>
    set({
      user: null,
      accessToken: null,
      cryptoKey: null,
      kdfSalt: null,
      isLocked: false,
      isInitializing: false,
    }),

  setInitializing: (v) => set({ isInitializing: v }),
}));
