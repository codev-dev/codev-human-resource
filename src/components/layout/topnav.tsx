// ============================================================================
// Top Navigation Bar
// ============================================================================
//
// Displays hamburger toggle (mobile), dynamic page title, global search,
// notification bell with unread count, and a user dropdown with role badge.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  LogOut,
  Menu,
  Search,
  User,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ---------------------------------------------------------------------------
// Route-to-title mapping
// ---------------------------------------------------------------------------

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/employees': 'Employees',
  '/employees/new': 'Add Employee',
  '/evaluations': 'Evaluations',
  '/evaluations/templates': 'Eval Templates',
  '/increase-requests': 'Increase Requests',
  '/increase-requests/new': 'New Increase Request',
  '/approvals/finance': 'Finance Approval',
  '/approvals/hr': 'HR Approval',
  '/progress-tracker': 'Progress Tracker',
  '/admin/users': 'User Management',
  '/admin/settings': 'Settings',
  '/unauthorized': 'Unauthorized',
};

function resolveTitle(pathname: string): string {
  // Exact match first
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];

  // Pattern matches for dynamic routes
  if (/^\/employees\/[^/]+$/.test(pathname)) return 'Employee Profile';
  if (/^\/evaluations\/[^/]+\/form$/.test(pathname)) return 'Evaluation Form';
  if (/^\/evaluations\/[^/]+$/.test(pathname)) return 'Evaluation Detail';
  if (/^\/increase-requests\/[^/]+\/negotiate$/.test(pathname)) return 'Negotiation';
  if (/^\/increase-requests\/[^/]+$/.test(pathname)) return 'Increase Detail';

  return 'CoDev HRM';
}

// ---------------------------------------------------------------------------
// Role display helpers
// ---------------------------------------------------------------------------

function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'admin':
      return 'default';
    case 'editor':
      return 'secondary';
    default:
      return 'outline';
  }
}

function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

// ---------------------------------------------------------------------------
// Session timer helper
// ---------------------------------------------------------------------------

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function formatTimeRemaining(lastActivity: number): string {
  const elapsed = Date.now() - lastActivity;
  const remaining = Math.max(0, SESSION_TIMEOUT_MS - elapsed);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TopNavProps {
  onMenuClick: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, lastActivity } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.getUnreadCount());

  const pageTitle = useMemo(() => resolveTitle(location.pathname), [location.pathname]);

  // Session countdown
  const [timeRemaining, setTimeRemaining] = useState(() =>
    formatTimeRemaining(lastActivity)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(lastActivity));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastActivity]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Toggle sidebar"
      >
        <Menu className="size-5" />
      </Button>

      {/* Page title */}
      <h1 className="text-base font-semibold tracking-tight">{pageTitle}</h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="hidden items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground sm:flex">
        <Search className="size-4" />
        <input
          type="text"
          placeholder="Search..."
          className="w-40 bg-transparent outline-none placeholder:text-muted-foreground lg:w-56"
          aria-label="Global search"
        />
      </div>

      {/* Session timer */}
      <div className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex" title="Session time remaining">
        <Clock className="size-3.5" />
        <span>{timeRemaining}</span>
      </div>

      {/* Notifications */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="relative"
        aria-label="Notifications"
        onClick={() => {
          // Notification panel will be implemented later
        }}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            aria-label="User menu"
          >
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="size-3.5" />
            </div>
            <span className="hidden text-sm font-medium lg:inline-block">
              {currentUser?.name ?? 'User'}
            </span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{currentUser?.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
              </div>
              <Badge variant={roleBadgeVariant(currentUser?.role ?? 'viewer')} className="mt-1 w-fit">
                {roleLabel(currentUser?.role ?? 'viewer')}
              </Badge>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={() => {
                // Profile page placeholder
              }}
            >
              <User className="size-4" />
              Profile
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={handleLogout} variant="destructive">
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export default TopNav;
