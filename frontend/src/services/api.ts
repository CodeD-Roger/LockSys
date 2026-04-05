/**
 * Typed API client for the LockSys backend.
 * Uses fetch with automatic token refresh on 401.
 */
import { useAuthStore } from '../store/authStore';

// In production the frontend is served by FastAPI on the same origin,
// so relative URLs work everywhere (localhost, Raspberry Pi, any hostname).
// Override with VITE_API_URL only if running a standalone dev frontend.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

// ─── Error ────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    username: string;
    is_admin: boolean;
    is_active: boolean;
    created_at: string;
    last_login?: string | null;
  };
  kdf_salt: string;
}

export interface AuthStatusResponse {
  registration_open: boolean;
}

export interface VaultResponse {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  is_shared: boolean;
  created_at: string;
  entry_count: number;
}

export interface EntryResponse {
  id: string;
  vault_id: string;
  created_by: string;
  encrypted_data: string;
  iv: string;
  entry_type: string;
  updated_at: string;
}

export interface AdminUserResponse {
  id: string;
  username: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  last_login?: string | null;
}

export interface InviteTokenResponse {
  token: string;
  created_at: string;
  expires_at: string;
  used_at?: string | null;
  used_by_username?: string | null;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data: AuthResponse = await res.json();
    useAuthStore.getState().setAccessToken(data.access_token);
    return true;
  } catch {
    return false;
  }
}

async function request<T = unknown>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = useAuthStore.getState().accessToken;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init.headers ?? {}) as Record<string, string>),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, init, false);
    }
    useAuthStore.getState().logout();
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === 'string') detail = body.detail;
    } catch { /* ignore */ }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const api = {
  auth: {
    async status(): Promise<AuthStatusResponse> {
      const res = await fetch(`${API_BASE}/auth/status`);
      if (!res.ok) return { registration_open: false };
      return res.json();
    },

    async register(
      username: string,
      password: string,
      invite_token?: string,
    ): Promise<AuthResponse> {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, invite_token }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: 'Registration failed' }));
        throw new ApiError(res.status, body.detail ?? 'Registration failed');
      }
      return res.json();
    },

    async login(username: string, password: string): Promise<AuthResponse> {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
        throw new ApiError(res.status, body.detail ?? 'Invalid credentials');
      }
      return res.json();
    },

    async refresh(): Promise<AuthResponse> {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new ApiError(res.status, 'Session expired');
      return res.json();
    },

    async logout(): Promise<void> {
      const token = useAuthStore.getState().accessToken;
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => { /* best-effort */ });
    },
  },

  vaults: {
    list: () => request<VaultResponse[]>('/vaults'),
    create: (data: { name: string; description?: string }) =>
      request<VaultResponse>('/vaults', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => request<VaultResponse>(`/vaults/${id}`),
    update: (id: string, data: { name?: string; description?: string }) =>
      request<VaultResponse>(`/vaults/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/vaults/${id}`, { method: 'DELETE' }),
  },

  entries: {
    list: (vaultId: string) => request<EntryResponse[]>(`/vaults/${vaultId}/entries`),
    create: (
      vaultId: string,
      data: { encrypted_data: string; iv: string; entry_type?: string },
    ) =>
      request<EntryResponse>(`/vaults/${vaultId}/entries`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id: string) => request<EntryResponse>(`/entries/${id}`),
    update: (
      id: string,
      data: { encrypted_data?: string; iv?: string; entry_type?: string },
    ) =>
      request<EntryResponse>(`/entries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/entries/${id}`, { method: 'DELETE' }),
  },

  admin: {
    // Utilisateurs
    listUsers: () => request<AdminUserResponse[]>('/admin/users'),

    createUser: (data: { username: string; password: string }) =>
      request<AdminUserResponse>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateUser: (id: string, data: { username?: string; password?: string; confirm_data_loss?: boolean }) =>
      request<AdminUserResponse>(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deactivateUser: (id: string) =>
      request<AdminUserResponse>(`/admin/users/${id}/deactivate`, { method: 'POST' }),

    activateUser: (id: string) =>
      request<AdminUserResponse>(`/admin/users/${id}/activate`, { method: 'POST' }),

    deleteUser: (id: string) =>
      request<void>(`/admin/users/${id}`, { method: 'DELETE' }),

    // Invitations
    createInvite: (expires_in_days: number = 7) =>
      request<InviteTokenResponse>('/admin/invites', {
        method: 'POST',
        body: JSON.stringify({ expires_in_days }),
      }),

    listInvites: () => request<InviteTokenResponse[]>('/admin/invites'),

    revokeInvite: (token: string) =>
      request<void>(`/admin/invites/${token}`, { method: 'DELETE' }),
  },
};
