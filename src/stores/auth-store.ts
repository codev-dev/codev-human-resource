// ============================================================================
// Auth Store — Zustand
// ============================================================================
//
// Manages authentication state: login, logout, session timeout (30 min).
// Persisted to localStorage under the key "hcm_auth".
// ============================================================================

import { create } from 'zustand';
import type { User } from '@/types';
import { storage, initializeData } from '@/lib/storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  lastActivity: number; // epoch ms
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  checkSession: () => void;
  touchActivity: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTH_KEY = 'hcm_auth';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

interface PersistedAuth {
  userId: string;
  lastActivity: number;
}

function loadPersistedAuth(): { user: User | null; lastActivity: number } {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { user: null, lastActivity: 0 };

    const persisted: PersistedAuth = JSON.parse(raw);
    const now = Date.now();

    // Session expired
    if (now - persisted.lastActivity > SESSION_TIMEOUT_MS) {
      localStorage.removeItem(AUTH_KEY);
      return { user: null, lastActivity: 0 };
    }

    // Ensure data layer is initialized before looking up user
    initializeData();

    const user = storage.getUser(persisted.userId) ?? null;
    if (!user) {
      localStorage.removeItem(AUTH_KEY);
      return { user: null, lastActivity: 0 };
    }

    return { user, lastActivity: persisted.lastActivity };
  } catch {
    localStorage.removeItem(AUTH_KEY);
    return { user: null, lastActivity: 0 };
  }
}

function persistAuth(userId: string, lastActivity: number): void {
  const data: PersistedAuth = { userId, lastActivity };
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

function clearPersistedAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initial = loadPersistedAuth();

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: initial.user,
  isAuthenticated: !!initial.user,
  lastActivity: initial.lastActivity,

  login: (email: string, password: string) => {
    // Ensure seed data is present
    initializeData();

    const users = storage.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return { success: false, error: 'No account found with that email address.' };
    }

    if (user.isLocked) {
      return { success: false, error: 'This account has been locked. Please contact an administrator.' };
    }

    if (user.password !== password) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    const now = Date.now();
    persistAuth(user.id, now);

    set({
      currentUser: user,
      isAuthenticated: true,
      lastActivity: now,
    });

    return { success: true };
  },

  logout: () => {
    clearPersistedAuth();
    set({
      currentUser: null,
      isAuthenticated: false,
      lastActivity: 0,
    });
  },

  checkSession: () => {
    const { isAuthenticated, lastActivity, logout } = get();
    if (!isAuthenticated) return;

    const now = Date.now();
    if (now - lastActivity > SESSION_TIMEOUT_MS) {
      logout();
    }
  },

  touchActivity: () => {
    const { currentUser, isAuthenticated } = get();
    if (!isAuthenticated || !currentUser) return;

    const now = Date.now();
    persistAuth(currentUser.id, now);
    set({ lastActivity: now });
  },
}));
