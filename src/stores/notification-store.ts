// ============================================================================
// Notification Store — Zustand
// ============================================================================
//
// Manages notifications for the currently authenticated user. Reads from and
// writes to the localStorage-backed storage layer.
// ============================================================================

import { create } from 'zustand';
import type { Notification } from '@/types';
import { storage } from '@/lib/storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationState {
  notifications: Notification[];

  /** Load notifications for a given user from storage. */
  loadForUser: (userId: string) => void;

  /** Add a new notification and persist it. */
  addNotification: (notification: Notification) => void;

  /** Mark a single notification as read. */
  markAsRead: (notificationId: string) => void;

  /** Mark all notifications for the current user as read. */
  markAllAsRead: (userId: string) => void;

  /** Remove a notification. */
  removeNotification: (notificationId: string) => void;

  /** Number of unread notifications. */
  getUnreadCount: () => number;

  /** Clear local state (e.g. on logout). */
  clear: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  loadForUser: (userId: string) => {
    const all = storage.getNotifications();
    const userNotifications = all
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    set({ notifications: userNotifications });
  },

  addNotification: (notification: Notification) => {
    storage.createNotification(notification);
    set((state) => ({
      notifications: [notification, ...state.notifications],
    }));
  },

  markAsRead: (notificationId: string) => {
    storage.updateNotification(notificationId, { read: true });
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n,
      ),
    }));
  },

  markAllAsRead: (userId: string) => {
    const all = storage.getNotifications();
    all.forEach((n) => {
      if (n.userId === userId && !n.read) {
        storage.updateNotification(n.id, { read: true });
      }
    });
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  removeNotification: (notificationId: string) => {
    storage.removeNotification(notificationId);
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
    }));
  },

  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },

  clear: () => {
    set({ notifications: [] });
  },
}));
