import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReadOnlyBanner } from '@/components/auth/read-only-banner';
import { useAuthStore } from '@/stores/auth-store';
import { storage } from '@/lib/storage';
import type { EvalStatus, EvalType, Evaluation, Employee } from '@/types';
import {
  ClipboardCheck,
  Search,
  Play,
  Eye,
  ArrowRight,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Status badge configuration
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<EvalStatus, { label: string; className: string }> = {
  due: {
    label: 'Due',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  },
  hr_review: {
    label: 'HR Review',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
};

// ---------------------------------------------------------------------------
// Helper: Due date indicator dot
// ---------------------------------------------------------------------------

function DueDateIndicator({ dueDate }: { dueDate: string }) {
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <span className="relative flex size-2.5" title="Overdue">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
      </span>
    );
  }
  if (diffDays <= 14) {
    return (
      <span className="relative flex size-2.5" title={`Due in ${diffDays} days`}>
        <span className="relative inline-flex size-2.5 rounded-full bg-yellow-500" />
      </span>
    );
  }
  return (
    <span className="relative flex size-2.5" title={`Due in ${diffDays} days`}>
      <span className="relative inline-flex size-2.5 rounded-full bg-green-500" />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helper: format date
// ---------------------------------------------------------------------------

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Helper: get action for a given evaluation
// ---------------------------------------------------------------------------

function getAction(evaluation: Evaluation, isViewer: boolean) {
  if (isViewer) {
    return { label: 'View', icon: Eye, href: `/evaluations/${evaluation.id}` };
  }

  switch (evaluation.status) {
    case 'due':
    case 'overdue':
      return { label: 'Start Evaluation', icon: Play, href: `/evaluations/${evaluation.id}/form` };
    case 'in_progress':
      return { label: 'Continue', icon: ArrowRight, href: `/evaluations/${evaluation.id}/form` };
    case 'rejected':
      return { label: 'Revise', icon: ArrowRight, href: `/evaluations/${evaluation.id}/form` };
    default:
      return { label: 'View', icon: Eye, href: `/evaluations/${evaluation.id}` };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EvalDashboardPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isViewer = currentUser?.role === 'viewer';

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | EvalType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EvalStatus>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Data
  const evaluations = useMemo(() => storage.getEvaluations(), []);
  const employees = useMemo(() => storage.getEmployees(), []);
  const templates = useMemo(() => storage.getEvalTemplates(), []);

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const templateMap = useMemo(() => {
    const map = new Map<string, string>();
    templates.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [templates]);

  // Unique departments
  const departments = useMemo(() => {
    const depts = new Set(employees.map((e) => e.department));
    return Array.from(depts).sort();
  }, [employees]);

  // Filtered evaluations
  const filtered = useMemo(() => {
    return evaluations.filter((ev) => {
      const employee = employeeMap.get(ev.employeeId);
      if (!employee) return false;

      // Search
      if (search) {
        const q = search.toLowerCase();
        const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
        const empId = employee.employeeId.toLowerCase();
        if (!fullName.includes(q) && !empId.includes(q)) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && ev.type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && ev.status !== statusFilter) return false;

      // Department filter
      if (departmentFilter !== 'all' && employee.department !== departmentFilter) return false;

      return true;
    });
  }, [evaluations, employeeMap, search, typeFilter, statusFilter, departmentFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const total = evaluations.length;
    const overdue = evaluations.filter((e) => e.status === 'overdue').length;
    const inProgress = evaluations.filter((e) => e.status === 'in_progress').length;
    const completed = evaluations.filter(
      (e) => e.status === 'approved' || e.status === 'completed'
    ).length;
    return { total, overdue, inProgress, completed };
  }, [evaluations]);

  return (
    <div className="space-y-6">
      <ReadOnlyBanner />

      {/* Page header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ClipboardCheck className="size-6 text-primary" />
          Evaluation Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track and manage employee performance evaluations.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Evaluations</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="size-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            Evaluations
          </CardTitle>
          <CardDescription>
            Showing {filtered.length} of {evaluations.length} evaluations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or employee ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Eval type */}
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | EvalType)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Eval Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="regularization">Regularization</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>

            {/* Status */}
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as 'all' | EvalStatus)}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="due">Due</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="hr_review">HR Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* Department */}
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Employee</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">ID</th>
                  <th className="hidden whitespace-nowrap px-4 py-3 font-medium md:table-cell">
                    Department
                  </th>
                  <th className="hidden whitespace-nowrap px-4 py-3 font-medium lg:table-cell">
                    Template
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Type</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Due Date</th>
                  <th className="hidden whitespace-nowrap px-4 py-3 font-medium text-right sm:table-cell">
                    Score
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      No evaluations match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((ev) => {
                    const employee = employeeMap.get(ev.employeeId);
                    if (!employee) return null;

                    const statusCfg = STATUS_CONFIG[ev.status];
                    const action = getAction(ev, isViewer);
                    const ActionIcon = action.icon;

                    return (
                      <tr
                        key={ev.id}
                        className="border-b transition-colors last:border-b-0 hover:bg-muted/30"
                      >
                        {/* Employee Name */}
                        <td className="px-4 py-3 font-medium">
                          {employee.firstName} {employee.lastName}
                        </td>

                        {/* Employee ID */}
                        <td className="px-4 py-3 text-muted-foreground">{employee.employeeId}</td>

                        {/* Department */}
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {employee.department}
                        </td>

                        {/* Template */}
                        <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                          {templateMap.get(ev.templateId) ?? '-'}
                        </td>

                        {/* Eval Type */}
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="capitalize">
                            {ev.type}
                          </Badge>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
                        </td>

                        {/* Due Date */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <DueDateIndicator dueDate={ev.dueDate} />
                            <span className="text-muted-foreground">{formatDate(ev.dueDate)}</span>
                          </div>
                        </td>

                        {/* Score */}
                        <td className="hidden px-4 py-3 text-right sm:table-cell">
                          {ev.totalScore > 0 ? (
                            <span className="font-medium">
                              {ev.totalScore.toFixed(1)}/{ev.maxScore}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={action.href}>
                              <ActionIcon className="size-3.5" />
                              <span className="hidden sm:inline">{action.label}</span>
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default EvalDashboardPage;
