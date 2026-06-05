import { create } from 'zustand';

const DEVICE_ID = 'web-supervisor-01';

interface AuthStore {
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  deviceId: string;
  login: (token: string, username?: string) => void;
  logout: () => void;
  getAuthHeaders: () => Record<string, string>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: !!localStorage.getItem('access_token'),
  token: localStorage.getItem('access_token'),
  username: localStorage.getItem('username'),
  deviceId: DEVICE_ID,

  login: (token, username) => {
    localStorage.setItem('access_token', token);
    if (username) localStorage.setItem('username', username);
    set({ isAuthenticated: true, token, username: username ?? null });
  },

  logout: () => {
    ['access_token', 'refresh_token', 'username'].forEach((k) =>
      localStorage.removeItem(k)
    );
    set({ isAuthenticated: false, token: null, username: null });
  },

  getAuthHeaders: () => ({
    Authorization: `Bearer ${get().token ?? ''}`,
    'X-Device-ID': DEVICE_ID,
    'Content-Type': 'application/json',
  }),
}));
