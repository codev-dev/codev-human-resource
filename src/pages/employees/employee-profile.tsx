import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Pencil,
  Save,
  X,
  Mail,
  Briefcase,
  Calendar,
  DollarSign,
  Building,
  UserCheck,
  Hash,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  TrendingUp,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { storage } from '@/lib/storage';
import { useAuthStore } from '@/stores/auth-store';
import { ReadOnlyBanner } from '@/components/auth/read-only-banner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Employee, Evaluation, SalaryHistory, IncreaseRequest } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<Employee['status'], { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400',
  },
  probation: {
    label: 'Probation',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
};

const EVAL_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  due: { label: 'Due', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  submitted: { label: 'Submitted', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  hr_review: { label: 'HR Review', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const INCREASE_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getFullName(emp: Employee): string {
  return `${emp.firstName} ${emp.lastName}`;
}

function formatStageName(stage: string): string {
  return stage
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------

type TabId = 'overview' | 'evaluations' | 'salary' | 'increases';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <User className="size-4" /> },
  { id: 'evaluations', label: 'Evaluations', icon: <ClipboardList className="size-4" /> },
  { id: 'salary', label: 'Salary History', icon: <TrendingUp className="size-4" /> },
  { id: 'increases', label: 'Increase Requests', icon: <FileText className="size-4" /> },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const isViewer = currentUser?.role === 'viewer';
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'editor';

  // Data
  const [employee, setEmployee] = useState<Employee | undefined>(() => (id ? storage.getEmployee(id) : undefined));
  const users = useMemo(() => storage.getUsers(), []);
  const employees = useMemo(() => storage.getEmployees(), []);
  const departments = useMemo(() => [...new Set(employees.map((e) => e.department))].sort(), [employees]);

  const supervisorName = useMemo(() => {
    if (!employee) return 'N/A';
    const sup = users.find((u) => u.id === employee.supervisorId);
    return sup ? sup.name : 'N/A';
  }, [employee, users]);

  const evaluations = useMemo(() => {
    if (!employee) return [];
    return storage
      .getEvaluations()
      .filter((ev: Evaluation) => ev.employeeId === employee.id)
      .sort((a: Evaluation, b: Evaluation) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [employee]);

  const salaryHistory = useMemo(() => {
    if (!employee) return [];
    return storage
      .getSalaryHistory()
      .filter((sh: SalaryHistory) => sh.employeeId === employee.id)
      .sort((a: SalaryHistory, b: SalaryHistory) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
  }, [employee]);

  const increaseRequests = useMemo(() => {
    if (!employee) return [];
    return storage
      .getIncreaseRequests()
      .filter((ir: IncreaseRequest) => ir.employeeId === employee.id)
      .sort((a: IncreaseRequest, b: IncreaseRequest) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [employee]);

  const cumulativeIncrease = useMemo(() => {
    if (!employee || salaryHistory.length === 0) return null;
    const oldest = salaryHistory[salaryHistory.length - 1];
    const pct = ((employee.currentSalary - oldest.previousSalary) / oldest.previousSalary) * 100;
    return { from: oldest.previousSalary, to: employee.currentSalary, percentage: pct };
  }, [employee, salaryHistory]);

  // State
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});
  const [expandedEvals, setExpandedEvals] = useState<Set<string>>(new Set());

  // Edit handlers
  const startEditing = useCallback(() => {
    if (!employee) return;
    setEditForm({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      department: employee.department,
      position: employee.position,
      hireDate: employee.hireDate,
      currentSalary: employee.currentSalary,
      status: employee.status,
      supervisorId: employee.supervisorId,
      clientId: employee.clientId,
    });
    setIsEditing(true);
  }, [employee]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditForm({});
  }, []);

  const handleSave = useCallback(() => {
    if (!employee || !id) return;
    const updated = storage.updateEmployee(id, editForm);
    if (updated) {
      setEmployee(updated);
    }
    setIsEditing(false);
    setEditForm({});
    setShowSaveDialog(false);
  }, [employee, id, editForm]);

  const toggleEvalExpanded = useCallback((evalId: string) => {
    setExpandedEvals((prev) => {
      const next = new Set(prev);
      if (next.has(evalId)) next.delete(evalId);
      else next.add(evalId);
      return next;
    });
  }, []);

  // Refresh employee on tab switch to get latest data
  useEffect(() => {
    if (id) {
      setEmployee(storage.getEmployee(id));
    }
  }, [id, activeTab]);

  if (!employee) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/employees')}>
          <ArrowLeft className="size-4" data-icon="inline-start" />
          Back to Employees
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto mb-3 size-10 text-muted-foreground/50" />
            <p className="text-lg font-medium">Employee Not Found</p>
            <p className="mt-1 text-sm text-muted-foreground">The employee record you are looking for does not exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[employee.status];

  return (
    <div className="space-y-6">
      <ReadOnlyBanner />

      {/* Back + Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit -ml-2" onClick={() => navigate('/employees')}>
          <ArrowLeft className="size-4" data-icon="inline-start" />
          Back to Employees
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{getFullName(employee)}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{employee.employeeId}</span>
                <span className="text-border">|</span>
                <span>{employee.department}</span>
                <Badge variant="secondary" className={statusCfg.className}>
                  {statusCfg.label}
                </Badge>
              </div>
            </div>
          </div>

          {canEdit && !isEditing && (
            <Button variant="outline" onClick={startEditing}>
              <Pencil className="size-4" data-icon="inline-start" />
              Edit
            </Button>
          )}
          {isEditing && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={cancelEditing}>
                <X className="size-4" data-icon="inline-start" />
                Cancel
              </Button>
              <Button onClick={() => setShowSaveDialog(true)}>
                <Save className="size-4" data-icon="inline-start" />
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Personal Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField
              icon={<User className="size-4" />}
              label="Full Name"
              editing={isEditing}
              editNode={
                <div className="flex gap-2">
                  <Input
                    value={editForm.firstName ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="First Name"
                  />
                  <Input
                    value={editForm.lastName ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                    placeholder="Last Name"
                  />
                </div>
              }
            >
              {getFullName(employee)}
            </InfoField>

            <InfoField
              icon={<Mail className="size-4" />}
              label="Email"
              editing={isEditing}
              editNode={
                <Input
                  type="email"
                  value={editForm.email ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                />
              }
            >
              {employee.email}
            </InfoField>

            <InfoField
              icon={<Briefcase className="size-4" />}
              label="Position"
              editing={isEditing}
              editNode={
                <Input
                  value={editForm.position ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, position: e.target.value }))}
                />
              }
            >
              {employee.position}
            </InfoField>

            <InfoField
              icon={<Building className="size-4" />}
              label="Department"
              editing={isEditing}
              editNode={
                <Select
                  value={editForm.department ?? ''}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, department: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            >
              {employee.department}
            </InfoField>

            <InfoField
              icon={<Calendar className="size-4" />}
              label="Hire Date"
              editing={isEditing}
              editNode={
                <Input
                  type="date"
                  value={editForm.hireDate ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, hireDate: e.target.value }))}
                />
              }
            >
              {formatDate(employee.hireDate)}
            </InfoField>

            <InfoField
              icon={<UserCheck className="size-4" />}
              label="Supervisor"
              editing={isEditing}
              editNode={
                <Select
                  value={editForm.supervisorId ?? ''}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, supervisorId: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            >
              {supervisorName}
            </InfoField>

            {!isViewer && (
              <InfoField
                icon={<DollarSign className="size-4" />}
                label="Current Salary"
                editing={isEditing}
                editNode={
                  <Input
                    type="number"
                    value={editForm.currentSalary ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, currentSalary: Number(e.target.value) }))}
                  />
                }
              >
                <span className="font-semibold">{formatCurrency(employee.currentSalary)}</span>
              </InfoField>
            )}

            <InfoField
              icon={<Hash className="size-4" />}
              label="Status"
              editing={isEditing}
              editNode={
                <Select
                  value={editForm.status ?? ''}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as Employee['status'] }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                  </SelectContent>
                </Select>
              }
            >
              <Badge variant="secondary" className={statusCfg.className}>{statusCfg.label}</Badge>
            </InfoField>

            <InfoField
              icon={<Hash className="size-4" />}
              label="Client ID"
              editing={isEditing}
              editNode={
                <Input
                  value={editForm.clientId ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, clientId: e.target.value }))}
                />
              }
            >
              {employee.clientId}
            </InfoField>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab employee={employee} supervisorName={supervisorName} isViewer={isViewer} />}
      {activeTab === 'evaluations' && <EvaluationsTab evaluations={evaluations} expandedEvals={expandedEvals} toggleExpanded={toggleEvalExpanded} />}
      {activeTab === 'salary' && <SalaryTab salaryHistory={salaryHistory} cumulativeIncrease={cumulativeIncrease} isViewer={isViewer} />}
      {activeTab === 'increases' && <IncreasesTab increaseRequests={increaseRequests} />}

      {/* Save Confirmation Dialog */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these changes? This will update the employee record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave}>Save Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InfoField sub-component
// ---------------------------------------------------------------------------

function InfoField({
  icon,
  label,
  children,
  editing,
  editNode,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  editing: boolean;
  editNode: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {icon}
        {label}
      </div>
      {editing ? editNode : <div className="text-sm">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({
  employee,
  supervisorName,
  isViewer,
}: {
  employee: Employee;
  supervisorName: string;
  isViewer: boolean;
}) {
  const statusCfg = STATUS_CONFIG[employee.status];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2">
          <DetailRow label="Employee ID" value={employee.employeeId} />
          <DetailRow label="Full Name" value={getFullName(employee)} />
          <DetailRow label="Email" value={employee.email} />
          <DetailRow label="Position" value={employee.position} />
          <DetailRow label="Department" value={employee.department} />
          <DetailRow label="Hire Date" value={formatDate(employee.hireDate)} />
          <DetailRow label="Supervisor" value={supervisorName} />
          <DetailRow label="Client ID" value={employee.clientId} />
          <DetailRow
            label="Status"
            value={
              <Badge variant="secondary" className={statusCfg.className}>
                {statusCfg.label}
              </Badge>
            }
          />
          {!isViewer && (
            <DetailRow label="Current Salary" value={<span className="font-semibold">{formatCurrency(employee.currentSalary)}</span>} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evaluations Tab
// ---------------------------------------------------------------------------

function EvaluationsTab({
  evaluations,
  expandedEvals,
  toggleExpanded,
}: {
  evaluations: Evaluation[];
  expandedEvals: Set<string>;
  toggleExpanded: (id: string) => void;
}) {
  if (evaluations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardList className="mx-auto mb-3 size-10 text-muted-foreground/50" />
          <p className="text-lg font-medium">No Evaluations Found</p>
          <p className="mt-1 text-sm text-muted-foreground">This employee has no evaluation records yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {evaluations.map((ev) => {
        const isExpanded = expandedEvals.has(ev.id);
        const percentage = ev.maxScore > 0 ? Math.round((ev.totalScore / ev.maxScore) * 100) : 0;
        const statusCfg = EVAL_STATUS_CONFIG[ev.status] ?? { label: ev.status, className: 'bg-gray-100 text-gray-700' };

        return (
          <Card key={ev.id}>
            <CardContent className="py-4">
              {/* Header row */}
              <button
                className="flex w-full items-center gap-3 text-left"
                onClick={() => toggleExpanded(ev.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                )}
                <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-medium capitalize">{ev.type.replace('_', ' ')} Evaluation</span>
                  <Badge variant="secondary" className={statusCfg.className}>
                    {statusCfg.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{formatDate(ev.createdAt)}</span>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-semibold tabular-nums">{percentage}%</div>
                  <div className="text-xs text-muted-foreground">
                    {ev.totalScore}/{ev.maxScore}
                  </div>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="mt-4 ml-7 space-y-3">
                  <Separator />
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Due Date: </span>
                      <span>{formatDate(ev.dueDate)}</span>
                    </div>
                    {ev.startedDate && (
                      <div>
                        <span className="text-muted-foreground">Started: </span>
                        <span>{formatDate(ev.startedDate)}</span>
                      </div>
                    )}
                    {ev.submittedDate && (
                      <div>
                        <span className="text-muted-foreground">Submitted: </span>
                        <span>{formatDate(ev.submittedDate)}</span>
                      </div>
                    )}
                    {ev.reviewedDate && (
                      <div>
                        <span className="text-muted-foreground">Reviewed: </span>
                        <span>{formatDate(ev.reviewedDate)}</span>
                      </div>
                    )}
                  </div>

                  {ev.answers.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Answers</p>
                        <div className="space-y-1.5">
                          {ev.answers.map((ans, i) => (
                            <div key={ans.questionId} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                              <span className="text-muted-foreground">Question {i + 1}</span>
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{String(ans.value)}</span>
                                <span className="text-xs text-muted-foreground">Score: {ans.score}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {ev.rejectionReason && (
                    <>
                      <Separator />
                      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                        <span className="font-medium">Rejection Reason: </span>
                        {ev.rejectionReason}
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Salary Tab
// ---------------------------------------------------------------------------

function SalaryTab({
  salaryHistory,
  cumulativeIncrease,
  isViewer,
}: {
  salaryHistory: SalaryHistory[];
  cumulativeIncrease: { from: number; to: number; percentage: number } | null;
  isViewer: boolean;
}) {
  if (isViewer) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="mx-auto mb-3 size-10 text-muted-foreground/50" />
          <p className="text-lg font-medium">Access Restricted</p>
          <p className="mt-1 text-sm text-muted-foreground">Salary information is not available for your role.</p>
        </CardContent>
      </Card>
    );
  }

  if (salaryHistory.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="mx-auto mb-3 size-10 text-muted-foreground/50" />
          <p className="text-lg font-medium">No Salary History</p>
          <p className="mt-1 text-sm text-muted-foreground">No salary changes have been recorded for this employee.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cumulative summary */}
      {cumulativeIncrease && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Cumulative Increase</p>
                <p className="mt-1 text-2xl font-bold text-primary">+{cumulativeIncrease.percentage.toFixed(1)}%</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="text-right">
                  <p className="text-muted-foreground">From</p>
                  <p className="font-medium">{formatCurrency(cumulativeIncrease.from)}</p>
                </div>
                <TrendingUp className="size-5 text-primary" />
                <div className="text-right">
                  <p className="text-muted-foreground">To</p>
                  <p className="font-semibold">{formatCurrency(cumulativeIncrease.to)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History table */}
      <Card>
        <CardContent className="p-0">
          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Effective Date</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Previous Salary</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">New Salary</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Increase</th>
                </tr>
              </thead>
              <tbody>
                {salaryHistory.map((sh) => (
                  <tr key={sh.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">{formatDate(sh.effectiveDate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(sh.previousSalary)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(sh.newSalary)}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        +{sh.increasePercentage.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden divide-y">
            {salaryHistory.map((sh) => (
              <div key={sh.id} className="px-4 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{formatDate(sh.effectiveDate)}</span>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    +{sh.increasePercentage.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{formatCurrency(sh.previousSalary)}</span>
                  <span>→</span>
                  <span className="font-medium text-foreground">{formatCurrency(sh.newSalary)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Increase Requests Tab
// ---------------------------------------------------------------------------

function IncreasesTab({ increaseRequests }: { increaseRequests: IncreaseRequest[] }) {
  const navigate = useNavigate();

  if (increaseRequests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="mx-auto mb-3 size-10 text-muted-foreground/50" />
          <p className="text-lg font-medium">No Increase Requests</p>
          <p className="mt-1 text-sm text-muted-foreground">No salary increase requests have been filed for this employee.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Request ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Current Stage</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Increase</th>
              </tr>
            </thead>
            <tbody>
              {increaseRequests.map((ir) => {
                const overallStatus = ir.hrApprovalStatus === 'approved'
                  ? 'approved'
                  : ir.hrApprovalStatus === 'rejected' || ir.financeApprovalStatus === 'rejected' || ir.clientApprovalStatus === 'rejected'
                    ? 'rejected'
                    : 'pending';
                const sCfg = INCREASE_STATUS_CONFIG[overallStatus];

                return (
                  <tr
                    key={ir.id}
                    className="cursor-pointer border-b last:border-b-0 transition-colors hover:bg-muted/30"
                    onClick={() => navigate(`/increase-requests/${ir.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-primary">{ir.requestId}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(ir.createdAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatStageName(ir.currentStage)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={sCfg.className}>{sCfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">+{ir.increasePercentage.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="sm:hidden divide-y">
          {increaseRequests.map((ir) => {
            const overallStatus = ir.hrApprovalStatus === 'approved'
              ? 'approved'
              : ir.hrApprovalStatus === 'rejected' || ir.financeApprovalStatus === 'rejected' || ir.clientApprovalStatus === 'rejected'
                ? 'rejected'
                : 'pending';
            const sCfg = INCREASE_STATUS_CONFIG[overallStatus];

            return (
              <div
                key={ir.id}
                className="cursor-pointer px-4 py-3 transition-colors hover:bg-muted/30"
                onClick={() => navigate(`/increase-requests/${ir.id}`)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">{ir.requestId}</span>
                  <Badge variant="secondary" className={sCfg.className}>{sCfg.label}</Badge>
                </div>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{formatDate(ir.createdAt)}</span>
                  <span className="text-border">|</span>
                  <span>{formatStageName(ir.currentStage)}</span>
                  <span className="ml-auto font-medium text-foreground">+{ir.increasePercentage.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default EmployeeProfilePage;
