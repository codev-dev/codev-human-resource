import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  UserPlus,
  CheckSquare,
  FileText,
  ArrowRight,
  Bell,
  Info,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import { storage } from '@/lib/storage';
import { ReadOnlyBanner } from '@/components/auth/read-only-banner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Notification } from '@/types';

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
  color: string;
}

function StatCard({ title, value, icon, description, color }: StatCardProps) {
  return (
    <Card size="sm">
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Notification icon by type
// ---------------------------------------------------------------------------

function NotificationIcon({ type }: { type: Notification['type'] }) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="size-4 text-emerald-500" />;
    case 'warning':
      return <AlertCircle className="size-4 text-amber-500" />;
    case 'error':
      return <XCircle className="size-4 text-destructive" />;
    default:
      return <Info className="size-4 text-blue-500" />;
  }
}

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Quick Action
// ---------------------------------------------------------------------------

interface QuickActionProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}

function QuickAction({ label, description, icon, to }: QuickActionProps) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-all hover:border-border hover:bg-muted/50 hover:shadow-sm"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export function DashboardPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const notifications = useNotificationStore((s) => s.notifications);

  const stats = useMemo(() => {
    const employees = storage.getEmployees();
    const evaluations = storage.getEvaluations();
    const increaseRequests = storage.getIncreaseRequests();

    const totalEmployees = employees.filter((e) => e.status === 'active').length;
    const pendingEvaluations = evaluations.filter(
      (e) => e.status === 'due' || e.status === 'in_progress',
    ).length;
    const activeIncreaseRequests = increaseRequests.filter(
      (r) =>
        r.currentStage !== 'payroll_updated' &&
        r.hrApprovalStatus !== 'rejected' &&
        r.financeApprovalStatus !== 'rejected' &&
        r.clientApprovalStatus !== 'rejected',
    ).length;
    const overdueItems = evaluations.filter((e) => e.status === 'overdue').length;

    return { totalEmployees, pendingEvaluations, activeIncreaseRequests, overdueItems };
  }, []);

  const recentNotifications = useMemo(() => {
    return notifications.slice(0, 5);
  }, [notifications]);

  const quickActions = useMemo(() => {
    if (!currentUser) return [];

    const actions: QuickActionProps[] = [];

    switch (currentUser.role) {
      case 'admin':
        actions.push(
          {
            label: 'Add Employee',
            description: 'Create a new employee record',
            icon: <UserPlus className="size-5" />,
            to: '/employees/new',
          },
          {
            label: 'View Approvals',
            description: 'Review pending HR approvals',
            icon: <CheckSquare className="size-5" />,
            to: '/approvals/hr',
          },
          {
            label: 'User Management',
            description: 'Manage system users and roles',
            icon: <Users className="size-5" />,
            to: '/admin/users',
          },
        );
        break;
      case 'editor':
        actions.push(
          {
            label: 'Start Evaluation',
            description: 'Begin a new employee evaluation',
            icon: <ClipboardList className="size-5" />,
            to: '/evaluations',
          },
          {
            label: 'New Increase Request',
            description: 'Submit a salary increase request',
            icon: <TrendingUp className="size-5" />,
            to: '/increase-requests/new',
          },
          {
            label: 'View Employees',
            description: 'Browse the employee directory',
            icon: <Users className="size-5" />,
            to: '/employees',
          },
        );
        break;
      case 'viewer':
        actions.push(
          {
            label: 'View Employees',
            description: 'Browse the employee directory',
            icon: <Users className="size-5" />,
            to: '/employees',
          },
          {
            label: 'View Evaluations',
            description: 'Review completed evaluations',
            icon: <ClipboardList className="size-5" />,
            to: '/evaluations',
          },
          {
            label: 'Progress Tracker',
            description: 'Track request progress',
            icon: <FileText className="size-5" />,
            to: '/progress-tracker',
          },
        );
        break;
    }

    return actions;
  }, [currentUser]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="space-y-6">
      <ReadOnlyBanner />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <LayoutDashboard className="size-6 text-primary" />
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          {greeting}, {currentUser?.name?.split(' ')[0] ?? 'there'}. Here is your overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon={<Users className="size-6" />}
          description="Active employees"
          color="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
        />
        <StatCard
          title="Pending Evaluations"
          value={stats.pendingEvaluations}
          icon={<ClipboardList className="size-6" />}
          description="Due or in progress"
          color="bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
        />
        <StatCard
          title="Increase Requests"
          value={stats.activeIncreaseRequests}
          icon={<TrendingUp className="size-6" />}
          description="Active requests"
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        />
        <StatCard
          title="Overdue Items"
          value={stats.overdueItems}
          icon={<AlertTriangle className="size-6" />}
          description="Requires attention"
          color={
            stats.overdueItems > 0
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted text-muted-foreground'
          }
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common tasks for your role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <QuickAction key={action.to} {...action} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="size-4" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Your latest notifications</CardDescription>
              </div>
              {notifications.length > 5 && (
                <Badge variant="secondary">
                  {notifications.filter((n) => !n.read).length} unread
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recentNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
                <p className="text-xs text-muted-foreground">
                  Notifications will appear here as you use the system.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentNotifications.map((notification, index) => (
                  <div key={notification.id}>
                    <div
                      className={`flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors ${
                        !notification.read ? 'bg-muted/50' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        <NotificationIcon type={notification.type} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm truncate ${!notification.read ? 'font-medium' : ''}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {notification.message}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                    {index < recentNotifications.length - 1 && (
                      <Separator className="my-0.5" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DashboardPage;
