// ============================================================================
// Increase Request List Page
// ============================================================================

import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReadOnlyBanner } from '@/components/auth/read-only-banner';
import { useAuthStore } from '@/stores/auth-store';
import { storage } from '@/lib/storage';
import type { IncreaseRequest, IncreaseStage, IncreaseStatus } from '@/types';
import {
  TrendingUp,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Stage badge config
// ---------------------------------------------------------------------------

const STAGE_CONFIG: Record<IncreaseStage, { label: string; color: string }> = {
  initiated: { label: 'Initiated', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  client_approval: { label: 'Client Approval', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  csm_negotiation: { label: 'CSM Negotiation', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  finance_approval: { label: 'Finance Approval', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  hr_review: { label: 'HR Review', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' },
  supervisor_notified: { label: 'Supervisor Notified', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
  payroll_updated: { label: 'Payroll Updated', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
};

const STATUS_CONFIG: Record<IncreaseStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

function getOverallStatus(req: IncreaseRequest): IncreaseStatus {
  if (req.clientApprovalStatus === 'rejected' || req.financeApprovalStatus === 'rejected' || req.hrApprovalStatus === 'rejected') return 'rejected';
  if (req.currentStage === 'payroll_updated' && req.payrollSubmitted) return 'approved';
  return 'pending';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IncreaseListPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const canCreate = currentUser?.role === 'admin' || currentUser?.role === 'editor';

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const requests = storage.getIncreaseRequests();
  const employees = storage.getEmployees();

  const employeeMap = useMemo(() => {
    const map = new Map<string, { name: string; department: string }>();
    employees.forEach((emp) => {
      map.set(emp.id, { name: `${emp.firstName} ${emp.lastName}`, department: emp.department });
    });
    return map;
  }, [employees]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach((emp) => depts.add(emp.department));
    return Array.from(depts).sort();
  }, [employees]);

  // Apply filters
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const empInfo = employeeMap.get(req.employeeId);
      const empName = empInfo?.name ?? '';
      const empDept = empInfo?.department ?? '';

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!empName.toLowerCase().includes(q) && !req.requestId.toLowerCase().includes(q)) {
          return false;
        }
      }

      // Stage filter
      if (stageFilter !== 'all' && req.currentStage !== stageFilter) return false;

      // Status filter
      if (statusFilter !== 'all') {
        const status = getOverallStatus(req);
        if (status !== statusFilter) return false;
      }

      // Department filter
      if (departmentFilter !== 'all' && empDept !== departmentFilter) return false;

      return true;
    });
  }, [requests, employeeMap, searchQuery, stageFilter, statusFilter, departmentFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const total = requests.length;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    requests.forEach((req) => {
      const status = getOverallStatus(req);
      if (status === 'pending') pending++;
      else if (status === 'approved') approved++;
      else rejected++;
    });
    return { total, pending, approved, rejected };
  }, [requests]);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  }

  return (
    <div className="space-y-6">
      <ReadOnlyBanner />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <TrendingUp className="size-6 text-primary" />
            Salary Increase Requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track salary increase requests through the approval pipeline.
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/increase-requests/new">
              <Plus className="size-4" data-icon="inline-start" />
              New Request
            </Link>
          </Button>
        )}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-semibold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/40">
              <Clock className="size-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-2xl font-semibold">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
              <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="text-2xl font-semibold">{stats.approved}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
              <XCircle className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rejected</p>
              <p className="text-2xl font-semibold">{stats.rejected}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card size="sm">
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by employee name or request ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="size-3.5" />
                Filters:
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {(Object.keys(STAGE_CONFIG) as IncreaseStage[]).map((stage) => (
                    <SelectItem key={stage} value={stage}>{STAGE_CONFIG[stage].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table (desktop) */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Request ID</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3 text-right">Current Salary</th>
                    <th className="px-4 py-3 text-right">Proposed %</th>
                    <th className="px-4 py-3">Current Stage</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                        No increase requests found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const empInfo = employeeMap.get(req.employeeId);
                      const status = getOverallStatus(req);
                      const stageConf = STAGE_CONFIG[req.currentStage];
                      const statusConf = STATUS_CONFIG[status];
                      return (
                        <tr
                          key={req.id}
                          className="cursor-pointer transition-colors hover:bg-muted/30"
                          onClick={() => navigate(`/increase-requests/${req.id}`)}
                        >
                          <td className="px-4 py-3 font-medium">{req.requestId}</td>
                          <td className="px-4 py-3">{empInfo?.name ?? 'Unknown'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{empInfo?.department ?? '-'}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatCurrency(req.currentSalary)}</td>
                          <td className="px-4 py-3 text-right font-mono">{req.increasePercentage.toFixed(1)}%</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stageConf.color}`}>
                              {stageConf.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {format(new Date(req.createdAt), 'MMM d, yyyy')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="icon-xs">
                              <ChevronRight className="size-4" />
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

      {/* Card layout (mobile) */}
      <div className="space-y-3 md:hidden">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No increase requests found matching your criteria.
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((req) => {
            const empInfo = employeeMap.get(req.employeeId);
            const status = getOverallStatus(req);
            const stageConf = STAGE_CONFIG[req.currentStage];
            const statusConf = STATUS_CONFIG[status];
            return (
              <Card
                key={req.id}
                className="cursor-pointer transition-colors hover:bg-muted/20"
                onClick={() => navigate(`/increase-requests/${req.id}`)}
              >
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{empInfo?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{req.requestId}</p>
                    </div>
                    <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stageConf.color}`}>
                      {stageConf.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{empInfo?.department ?? '-'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatCurrency(req.currentSalary)} / +{req.increasePercentage.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(req.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export default IncreaseListPage;
