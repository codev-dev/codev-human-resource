// ============================================================================
// Session Timeout Modal (Story 1.6)
// ============================================================================
//
// Displays a warning when the user session is about to expire. Shows a
// countdown timer and provides options to extend the session or log out.
// Auto-logs out when the countdown reaches zero.
// ============================================================================

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 5 * 60 * 1000; // Show warning 5 minutes before timeout
const CHECK_INTERVAL_MS = 1000; // Check every second

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SessionTimeoutModal() {
  const navigate = useNavigate();
  const { isAuthenticated, lastActivity, touchActivity, logout } = useAuthStore();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleExtendSession = useCallback(() => {
    touchActivity();
    setShowWarning(false);
  }, [touchActivity]);

  const handleLogout = useCallback(() => {
    setShowWarning(false);
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarning(false);
      return;
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivity;
      const remaining = SESSION_TIMEOUT_MS - elapsed;

      if (remaining <= 0) {
        // Session expired
        setShowWarning(false);
        logout();
        navigate('/login', { replace: true });
        return;
      }

      if (remaining <= WARNING_BEFORE_MS) {
        setShowWarning(true);
        setRemainingSeconds(Math.ceil(remaining / 1000));
      } else {
        setShowWarning(false);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, lastActivity, logout, navigate]);

  if (!isAuthenticated || !showWarning) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const isUrgent = remainingSeconds <= 60;

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <Clock className="size-7" />
          </div>
          <AlertDialogTitle className="text-center">
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Your session will expire due to inactivity. You will be logged out automatically.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex justify-center">
          <div
            className={`rounded-lg px-6 py-3 text-center font-mono text-3xl font-bold tabular-nums transition-colors ${
              isUrgent
                ? 'bg-destructive/10 text-destructive'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
            }`}
          >
            {timeDisplay}
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="size-4" />
            Logout
          </Button>
          <Button onClick={handleExtendSession}>
            Extend Session
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default SessionTimeoutModal;
