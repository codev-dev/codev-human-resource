// ============================================================================
// Read-Only Banner (Story 2.4)
// ============================================================================
//
// Displays a subtle banner when the current user has the "viewer" role,
// indicating that the page is in read-only mode.
// ============================================================================

import { Eye } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

export function ReadOnlyBanner() {
  const currentUser = useAuthStore((s) => s.currentUser);

  if (currentUser?.role !== 'viewer') return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
      <Eye className="size-4 shrink-0" />
      <span>You are viewing this page in read-only mode.</span>
    </div>
  );
}

export default ReadOnlyBanner;
