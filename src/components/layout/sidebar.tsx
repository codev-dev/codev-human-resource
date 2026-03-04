// ============================================================================
// Sidebar Navigation
// ============================================================================
//
// Collapsible sidebar with role-based navigation groups. Uses the project's
// sidebar design tokens (bg-sidebar, text-sidebar-foreground, etc.).
// On mobile viewports the sidebar renders as an overlay with a backdrop.
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FileText,
  TrendingUp,
  ListChecks,
  CheckSquare,
  ShieldCheck,
  Settings,
  UserCog,
  X,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import type { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  allowedRoles?: UserRole[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
  allowedRoles?: UserRole[];
}

// ---------------------------------------------------------------------------
// Navigation configuration
// ---------------------------------------------------------------------------

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Dashboard',
    items: [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: <LayoutDashboard className="size-4" />,
      },
    ],
  },
  {
    title: 'Employees',
    items: [
      {
        label: 'Employee List',
        path: '/employees',
        icon: <Users className="size-4" />,
      },
    ],
  },
  {
    title: 'Evaluations',
    items: [
      {
        label: 'Eval Dashboard',
        path: '/evaluations',
        icon: <ClipboardCheck className="size-4" />,
      },
      {
        label: 'Eval Templates',
        path: '/evaluations/templates',
        icon: <FileText className="size-4" />,
        allowedRoles: ['admin'],
      },
    ],
  },
  {
    title: 'Salary Increase',
    items: [
      {
        label: 'Increase Requests',
        path: '/increase-requests',
        icon: <TrendingUp className="size-4" />,
      },
      {
        label: 'Progress Tracker',
        path: '/progress-tracker',
        icon: <BarChart3 className="size-4" />,
      },
      {
        label: 'Finance Approval',
        path: '/approvals/finance',
        icon: <DollarSign className="size-4" />,
        allowedRoles: ['admin', 'editor'],
      },
      {
        label: 'HR Approval',
        path: '/approvals/hr',
        icon: <CheckSquare className="size-4" />,
        allowedRoles: ['admin'],
      },
    ],
  },
  {
    title: 'Admin',
    allowedRoles: ['admin'],
    items: [
      {
        label: 'User Management',
        path: '/admin/users',
        icon: <UserCog className="size-4" />,
        allowedRoles: ['admin'],
      },
      {
        label: 'Settings',
        path: '/admin/settings',
        icon: <Settings className="size-4" />,
        allowedRoles: ['admin'],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAllowed(roles: UserRole[] | undefined, userRole: UserRole): boolean {
  if (!roles || roles.length === 0) return true;
  return roles.includes(userRole);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const location = useLocation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const userRole = currentUser?.role ?? 'viewer';

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter groups/items by role
  const visibleGroups = NAV_GROUPS.filter((group) => {
    if (!isAllowed(group.allowedRoles, userRole)) return false;
    return group.items.some((item) => isAllowed(item.allowedRoles, userRole));
  });

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* ---- Logo area ---- */}
      <div
        className="flex h-14 shrink-0 items-center justify-center border-b border-sidebar-border px-4"
      >
        <img
          src="https://cdn.prod.website-files.com/686c5cf5daf49068c29a4269/699cffbca06267e8769324c6_codev-code%403x.avif"
          alt="CoDev"
          className={cn(
            'shrink-0 object-contain',
            collapsed ? 'h-7 w-auto' : 'h-9 w-auto'
          )}
        />

        {/* Mobile close */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-3 md:hidden"
          onClick={onMobileClose}
          aria-label="Close sidebar"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* ---- Navigation ---- */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {visibleGroups.map((group, gi) => (
          <div key={group.title} className={cn(gi > 0 && 'mt-6')}>
            {!collapsed && (
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
            )}
            {collapsed && gi > 0 && <Separator className="mb-3" />}

            <ul className="space-y-0.5">
              {group.items
                .filter((item) => isAllowed(item.allowedRoles, userRole))
                .map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === '/employees' || item.path === '/evaluations' || item.path === '/increase-requests'}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                          collapsed && 'justify-center px-0',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-primary'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      {item.icon}
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* ---- Collapse toggle (desktop only) ---- */}
      <div className="hidden shrink-0 border-t border-sidebar-border p-3 md:block">
        <Button
          variant="ghost"
          size="sm"
          className={cn('w-full', collapsed ? 'justify-center' : 'justify-start')}
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <>
              <ChevronLeft className="size-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          // Base
          'z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-200',
          // Desktop
          'hidden md:flex md:fixed md:inset-y-0 md:left-0',
          collapsed ? 'md:w-16' : 'md:w-60',
          // Mobile
          mobileOpen &&
            'fixed inset-y-0 left-0 flex w-64 shadow-xl md:shadow-none'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export default Sidebar;
