// ============================================================================
// App Layout
// ============================================================================
//
// Main layout wrapper that combines Sidebar + TopNav + page content (Outlet).
// Initializes seed data and checks authentication session on mount.
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { initializeData } from '@/lib/storage';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import { Sidebar } from '@/components/layout/sidebar';
import { TopNav } from '@/components/layout/topnav';
import { SessionTimeoutModal } from '@/components/auth/session-timeout-modal';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { currentUser, checkSession, touchActivity } = useAuthStore();
  const loadNotifications = useNotificationStore((s) => s.loadForUser);

  // Initialize data layer and check session on mount
  useEffect(() => {
    initializeData();
    checkSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load notifications when user is available
  useEffect(() => {
    if (currentUser) {
      loadNotifications(currentUser.id);
    }
  }, [currentUser, loadNotifications]);

  // Periodically check session (every 60s)
  useEffect(() => {
    const interval = setInterval(() => {
      checkSession();
    }, 60_000);
    return () => clearInterval(interval);
  }, [checkSession]);

  // Touch activity on user interaction
  useEffect(() => {
    const handleActivity = () => touchActivity();
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [touchActivity]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handleMobileOpen = useCallback(() => {
    setMobileSidebarOpen(true);
  }, []);

  const handleMobileClose = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={handleToggleSidebar}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={handleMobileClose}
      />

      {/* Main area */}
      <div
        className={cn(
          'flex flex-1 flex-col transition-all duration-200',
          // Push content right to accommodate the sidebar on desktop
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-60'
        )}
      >
        <TopNav onMenuClick={handleMobileOpen} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Session timeout warning */}
      <SessionTimeoutModal />
    </div>
  );
}

export default AppLayout;
