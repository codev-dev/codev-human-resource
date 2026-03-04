// ============================================================================
// Route Guard (Story 2.1)
// ============================================================================
//
// Protects routes based on authentication and role. Redirects unauthenticated
// users to /login and unauthorized roles to /unauthorized.
// ============================================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import type { UserRole } from '@/types';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface RouteGuardProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

export function RouteGuard({ allowedRoles, children }: RouteGuardProps) {
  const { isAuthenticated, currentUser } = useAuthStore();
  const location = useLocation();

  // Not logged in -> redirect to login, preserving intended destination
  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(currentUser.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}

export default RouteGuard;
