// ============================================================================
// Increase Request Detail Page
// ============================================================================
// Full lifecycle view: stepper, eval gate, client approval, CSM negotiation,
// finance approval, HR review, supervisor notification, payroll, salary history.
// ============================================================================

import { useState, useMemo, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ReadOnlyBanner } from '@/components/auth/read-only-banner';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import { storage } from '@/lib/storage';
import type {
  IncreaseRequest,
  IncreaseStage,
  StageEntry,
  NegotiationEntry,
  SalaryHistory,
  Employee,
} from '@/types';
import {
  ArrowLeft,
  Check,
  Clock,
  AlertTriangle,
  Shield,
  ShieldCheck,
  DollarSign,
  FileText,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Bell,
  CreditCard,
  ExternalLink,
  Lock,
  User,
  ChevronRight,
  XCircle,
  CheckCircle2,
  Info,
  Plus,
  Send,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_STAGES: IncreaseStage[] = [
  'initiated',
  'client_approval',
  'csm_negotiation',
  'finance_approval',
  'hr_review',
  'supervisor_notified',
  'payroll_updated',
];

const STAGE_LABELS: Record<IncreaseStage, string> = {
  initiated: 'Initiated',
  client_approval: 'Client Approval',
  csm_negotiation: 'CSM Negotiation',
  finance_approval: 'Finance Approval',
  hr_review: 'HR Review (Sam)',
  supervisor_notified: 'Supervisor Notified',
  payroll_updated: 'Payroll Updated',
};

const STAGE_ICONS: Record<IncreaseStage, React.ReactNode> = {
  initiated: <FileText className="size-4" />,
  client_approval: <Shield className="size-4" />,
  csm_negotiation: <MessageSquare className="size-4" />,
  finance_approval: <DollarSign className="size-4" />,
  hr_review: <ShieldCheck className="size-4" />,
  supervisor_notified: <Bell className="size-4" />,
  payroll_updated: <CreditCard className="size-4" />,
};

const SECTION_IDS: Record<IncreaseStage, string> = {
  initiated: 'section-initiated',
  client_approval: 'section-client-approval',
  csm_negotiation: 'section-csm-negotiation',
  finance_approval: 'section-finance-approval',
  hr_review: 'section-hr-review',
  supervisor_notified: 'section-supervisor-notified',
  payroll_updated: 'section-payroll-updated',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d, yyyy');
}

function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IncreaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const addNotification = useNotificationStore((s) => s.addNotification);

  // Force re-renders after mutations
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const request = id ? storage.getIncreaseRequest(id) : undefined;
  const employees = storage.getEmployees();
  const evaluations = storage.getEvaluations();
  const salaryHistoryAll = storage.getSalaryHistory();
  const users = storage.getUsers();

  // Section refs for anchor scrolling
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const employee = useMemo<Employee | undefined>(() => {
    if (!request) return undefined;
    return employees.find((e) => e.id === request.employeeId);
  }, [request, employees]);

  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';

  const requestedByUser = useMemo(() => {
    if (!request) return undefined;
    return users.find((u) => u.id === request.requestedBy);
  }, [request, users]);

  const linkedEval = useMemo(() => {
    if (!request?.linkedEvalId) return undefined;
    return evaluations.find((ev) => ev.id === request.linkedEvalId);
  }, [request, evaluations]);

  const evalGateCleared = linkedEval?.status === 'approved';

  // Salary history for this employee
  const empSalaryHistory = useMemo<SalaryHistory[]>(() => {
    if (!request) return [];
    return salaryHistoryAll
      .filter((sh) => sh.employeeId === request.employeeId)
      .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
  }, [request, salaryHistoryAll]);

  // Chart data
  const chartData = useMemo(() => {
    if (!employee) return [];
    const data: { year: string; salary: number }[] = [];
    const hireYear = new Date(employee.hireDate).getFullYear();
    data.push({ year: String(hireYear), salary: empSalaryHistory.length > 0 ? empSalaryHistory[0].previousSalary : employee.currentSalary });
    empSalaryHistory.forEach((sh) => {
      data.push({ year: String(new Date(sh.effectiveDate).getFullYear()), salary: sh.newSalary });
    });
    return data;
  }, [employee, empSalaryHistory]);

  // Cumulative increase
  const cumulativeIncrease = useMemo(() => {
    if (empSalaryHistory.length === 0) return { amount: 0, percentage: 0 };
    const first = empSalaryHistory[0].previousSalary;
    const last = empSalaryHistory[empSalaryHistory.length - 1].newSalary;
    return {
      amount: last - first,
      percentage: ((last - first) / first) * 100,
    };
  }, [empSalaryHistory]);

  // Average increase percentage
  const avgIncrease = useMemo(() => {
    if (empSalaryHistory.length === 0) return 0;
    const total = empSalaryHistory.reduce((sum, sh) => sum + sh.increasePercentage, 0);
    return total / empSalaryHistory.length;
  }, [empSalaryHistory]);

  // Deviation flag (Story 12.4)
  const deviationFlag = useMemo(() => {
    if (!request || empSalaryHistory.length === 0) return null;
    const diff = Math.abs(request.increasePercentage - avgIncrease);
    const pctDeviation = (diff / avgIncrease) * 100;
    if (pctDeviation > 20) {
      return request.increasePercentage > avgIncrease ? 'above' : 'below';
    }
    return null;
  }, [request, avgIncrease, empSalaryHistory.length]);

  // Supervisor info
  const supervisor = useMemo(() => {
    if (!employee) return undefined;
    return users.find((u) => u.id === employee.supervisorId);
  }, [employee, users]);

  const isAdmin = currentUser?.role === 'admin';
  const isEditor = currentUser?.role === 'editor';
  const canAct = isAdmin || isEditor;

  // ---------------------------------------------------------------------------
  // Stage mutation helpers
  // ---------------------------------------------------------------------------

  function updateRequest(data: Partial<IncreaseRequest>) {
    if (!request || !id) return;
    storage.updateIncreaseRequest(id, { ...data, updatedAt: new Date().toISOString() });
    refresh();
  }

  function advanceStage(nextStage: IncreaseStage) {
    if (!request) return;
    const now = new Date().toISOString();
    const updatedHistory = request.stageHistory.map((s) =>
      s.stage === request.currentStage ? { ...s, status: 'completed' as const, completedDate: now } : s
    );
    const newEntry: StageEntry = {
      stage: nextStage,
      status: 'active',
      enteredDate: now,
      ownerId: currentUser?.id,
      ownerName: currentUser?.name,
    };
    updatedHistory.push(newEntry);
    updateRequest({ currentStage: nextStage, stageHistory: updatedHistory });
  }

  function scrollToSection(stage: IncreaseStage) {
    const el = sectionRefs.current[SECTION_IDS[stage]];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ---------------------------------------------------------------------------
  // 404
  // ---------------------------------------------------------------------------

  if (!request) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <XCircle className="size-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Increase request not found.</p>
            <Button variant="outline" asChild>
              <Link to="/increase-requests">
                <ArrowLeft className="size-4" data-icon="inline-start" />
                Back to List
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Compute stage statuses for the stepper
  // ---------------------------------------------------------------------------

  const stageIndex = ALL_STAGES.indexOf(request.currentStage);
  const isRejected = request.clientApprovalStatus === 'rejected' || request.financeApprovalStatus === 'rejected' || request.hrApprovalStatus === 'rejected';
  const isFullyClosed = request.currentStage === 'payroll_updated' && request.payrollSubmitted;

  function getStepStatus(stage: IncreaseStage): 'completed' | 'active' | 'pending' | 'blocked' {
    const idx = ALL_STAGES.indexOf(stage);
    const historyEntry = request!.stageHistory.find((s) => s.stage === stage);
    if (historyEntry?.status === 'completed') return 'completed';
    if (stage === request!.currentStage) return isRejected ? 'blocked' : 'active';
    if (idx < stageIndex) return 'completed';
    return 'pending';
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <ReadOnlyBanner />

      {/* Back + Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon-sm" className="mt-1" asChild>
            <Link to="/increase-requests">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{request.requestId}</h1>
              {isFullyClosed ? (
                <Badge variant="default" className="bg-green-600">Completed</Badge>
              ) : isRejected ? (
                <Badge variant="destructive">Rejected</Badge>
              ) : (
                <Badge variant="outline">In Progress</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {employeeName} &middot; Created {formatDate(request.createdAt)}
              {requestedByUser && <> by {requestedByUser.name}</>}
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Progress Stepper (Epic 20) */}
      {/* ================================================================== */}
      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="flex min-w-[700px] items-start">
              {ALL_STAGES.map((stage, idx) => {
                const status = getStepStatus(stage);
                const historyEntry = request.stageHistory.find((s) => s.stage === stage);
                const isLast = idx === ALL_STAGES.length - 1;

                let stepColor = 'bg-muted text-muted-foreground';
                let lineColor = 'bg-muted';
                let ringColor = '';

                if (status === 'completed') {
                  stepColor = 'bg-green-600 text-white';
                  lineColor = 'bg-green-600';
                } else if (status === 'active') {
                  stepColor = 'bg-primary text-primary-foreground';
                  ringColor = 'ring-2 ring-primary/30';
                } else if (status === 'blocked') {
                  stepColor = 'bg-amber-500 text-white';
                  ringColor = 'ring-2 ring-amber-500/30';
                }

                return (
                  <div key={stage} className="flex flex-1 items-start">
                    <div className="flex flex-col items-center">
                      {/* Clickable step circle (Story 20.8) */}
                      <button
                        onClick={() => scrollToSection(stage)}
                        className={`flex size-9 items-center justify-center rounded-full transition-all ${stepColor} ${ringColor} hover:opacity-80`}
                        title={`Go to ${STAGE_LABELS[stage]}`}
                      >
                        {status === 'completed' ? (
                          <Check className="size-4" />
                        ) : status === 'blocked' ? (
                          <AlertTriangle className="size-4" />
                        ) : (
                          STAGE_ICONS[stage]
                        )}
                      </button>
                      {/* Label */}
                      <p className="mt-2 text-center text-xs font-medium leading-tight" style={{ maxWidth: 90 }}>
                        {STAGE_LABELS[stage]}
                      </p>
                      {/* Owner (Story 20.5) */}
                      {historyEntry?.ownerName && (
                        <p className="mt-0.5 text-center text-[10px] text-muted-foreground" style={{ maxWidth: 90 }}>
                          {historyEntry.ownerName}
                        </p>
                      )}
                      {/* Completed timestamp (Story 20.3) */}
                      {historyEntry?.completedDate && (
                        <p className="mt-0.5 text-center text-[10px] text-muted-foreground">
                          {formatDate(historyEntry.completedDate)}
                        </p>
                      )}
                    </div>
                    {/* Connector line */}
                    {!isLast && (
                      <div className="mt-4 flex flex-1 items-center px-1">
                        <div className={`h-0.5 w-full rounded-full ${status === 'completed' ? lineColor : 'bg-muted'}`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Eval Gate Section (Epic 13) */}
      {/* ================================================================== */}
      <div ref={(el) => { sectionRefs.current[SECTION_IDS.initiated] = el; }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              Evaluation Gate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {evalGateCleared ? (
              <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/40">
                <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Eval Gate Cleared</p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Evaluation score: {linkedEval!.totalScore}/{linkedEval!.maxScore}
                    {linkedEval!.reviewedDate && <> &middot; Approved on {formatDate(linkedEval!.reviewedDate)}</>}
                  </p>
                </div>
                <Link
                  to={`/evaluations/${linkedEval!.id}`}
                  className="ml-auto text-sm text-green-700 underline underline-offset-2 hover:text-green-900 dark:text-green-300"
                >
                  View Evaluation
                </Link>
              </div>
            ) : (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                <div className="flex gap-3">
                  <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Evaluation Not Approved
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      {request.linkedEvalId
                        ? 'The linked evaluation has not been approved yet. Finance and HR actions are disabled until the evaluation is approved.'
                        : 'No evaluation is linked to this request. Finance and HR actions are disabled.'}
                    </p>
                    {request.linkedEvalId && (
                      <Link
                        to={`/evaluations/${request.linkedEvalId}`}
                        className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300"
                      >
                        <ExternalLink className="size-3.5" />
                        View pending evaluation
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* Client Approval Section (Epic 9) */}
      {/* ================================================================== */}
      <ClientApprovalSection
        ref={(el) => { sectionRefs.current[SECTION_IDS.client_approval] = el; }}
        request={request}
        employeeName={employeeName}
        employee={employee}
        canAct={canAct}
        onApprove={() => {
          updateRequest({
            clientApprovalStatus: 'approved',
            clientApprovalDate: new Date().toISOString(),
          });
          advanceStage('csm_negotiation');
        }}
        onReject={(notes) => {
          updateRequest({
            clientApprovalStatus: 'rejected',
            clientApprovalDate: new Date().toISOString(),
            clientNotes: notes,
          });
        }}
        onAddNotes={(notes) => {
          updateRequest({ clientNotes: notes });
        }}
      />

      {/* ================================================================== */}
      {/* CSM Negotiation Section (Epic 10) */}
      {/* ================================================================== */}
      <CSMNegotiationSection
        ref={(el) => { sectionRefs.current[SECTION_IDS.csm_negotiation] = el; }}
        request={request}
        canAct={canAct}
        currentUser={currentUser}
        onAddEntry={(entry) => {
          const updated = [...request.negotiations, entry];
          updateRequest({ negotiations: updated });
        }}
        onCloseNegotiation={(agreedPct) => {
          updateRequest({
            agreedPercentage: agreedPct,
            negotiationLocked: true,
            proposedSalary: Math.round(request.currentSalary * (1 + agreedPct / 100)),
            increasePercentage: agreedPct,
          });
          advanceStage('finance_approval');
        }}
      />

      {/* ================================================================== */}
      {/* Finance Approval Section (Epic 11 stories 11.1-11.3) */}
      {/* ================================================================== */}
      <FinanceApprovalSection
        ref={(el) => { sectionRefs.current[SECTION_IDS.finance_approval] = el; }}
        request={request}
        evalGateCleared={evalGateCleared}
        canAct={canAct}
        onApprove={(comment) => {
          updateRequest({
            financeApprovalStatus: 'approved',
            financeApproverId: currentUser?.id,
            financeApprovalDate: new Date().toISOString(),
            financeComment: comment,
          });
          advanceStage('hr_review');
        }}
        onReject={(comment) => {
          updateRequest({
            financeApprovalStatus: 'rejected',
            financeApproverId: currentUser?.id,
            financeApprovalDate: new Date().toISOString(),
            financeComment: comment,
          });
        }}
      />

      {/* ================================================================== */}
      {/* HR Review (Sam) Section (Epic 11 stories 11.4-11.6) */}
      {/* ================================================================== */}
      <HRReviewSection
        ref={(el) => { sectionRefs.current[SECTION_IDS.hr_review] = el; }}
        request={request}
        evalGateCleared={evalGateCleared}
        canAct={canAct && isAdmin}
        supervisor={supervisor}
        employeeName={employeeName}
        onApprove={(comment) => {
          const now = new Date().toISOString();
          updateRequest({
            hrApprovalStatus: 'approved',
            hrApproverId: currentUser?.id,
            hrApprovalDate: now,
            hrComment: comment,
          });
          advanceStage('supervisor_notified');
          // Epic 14: Send notification to supervisor
          if (supervisor) {
            addNotification({
              id: `notif-${Date.now()}`,
              userId: supervisor.id,
              title: 'Salary Increase Approved',
              message: `The salary increase for ${employeeName} (${request.requestId}) has been approved. Please notify the employee.`,
              type: 'success',
              read: false,
              link: `/increase-requests/${request.id}`,
              createdAt: now,
            });
          }
        }}
        onReject={(comment) => {
          updateRequest({
            hrApprovalStatus: 'rejected',
            hrApproverId: currentUser?.id,
            hrApprovalDate: new Date().toISOString(),
            hrComment: comment,
          });
        }}
      />

      {/* ================================================================== */}
      {/* Salary History Panel (Epic 12) */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            Salary History
          </CardTitle>
          <CardDescription>Historical salary data and trend for {employeeName}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {empSalaryHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No salary history records found for this employee.</p>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Increases</p>
                  <p className="text-xl font-semibold">{empSalaryHistory.length}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Cumulative Increase</p>
                  <p className="text-xl font-semibold">{formatCurrency(cumulativeIncrease.amount)}</p>
                  <p className="text-xs text-muted-foreground">+{cumulativeIncrease.percentage.toFixed(1)}% since hire</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Average Increase</p>
                  <p className="text-xl font-semibold">{avgIncrease.toFixed(1)}%</p>
                </div>
              </div>

              {/* Deviation flag (Story 12.4) */}
              {deviationFlag && (
                <div className={`flex items-center gap-2 rounded-md border p-3 text-sm ${
                  deviationFlag === 'above'
                    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                }`}>
                  {deviationFlag === 'above' ? (
                    <TrendingUp className="size-4" />
                  ) : (
                    <TrendingDown className="size-4" />
                  )}
                  <span>
                    This request ({request.increasePercentage.toFixed(1)}%) is significantly{' '}
                    {deviationFlag === 'above' ? 'above' : 'below'} the employee's average increase
                    ({avgIncrease.toFixed(1)}%) — deviation exceeds 20%.
                  </span>
                </div>
              )}

              {/* Chart (Story 12.2) */}
              {chartData.length > 1 && (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="year" className="text-xs" />
                      <YAxis
                        className="text-xs"
                        tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), 'Salary']}
                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="salary"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* History table (Story 12.1) */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2 text-right">Previous</th>
                      <th className="px-3 py-2 text-right">New</th>
                      <th className="px-3 py-2 text-right">Increase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {empSalaryHistory.map((sh) => (
                      <tr key={sh.id}>
                        <td className="px-3 py-2">{formatDate(sh.effectiveDate)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(sh.previousSalary)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(sh.newSalary)}</td>
                        <td className="px-3 py-2 text-right font-mono text-green-600 dark:text-green-400">
                          +{sh.increasePercentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Supervisor Notification Section (Epic 14) */}
      {/* ================================================================== */}
      <SupervisorNotificationSection
        ref={(el) => { sectionRefs.current[SECTION_IDS.supervisor_notified] = el; }}
        request={request}
        supervisor={supervisor}
        employeeName={employeeName}
        canAct={canAct}
        onNotifySupervisor={() => {
          updateRequest({
            supervisorNotified: true,
            supervisorNotifiedDate: new Date().toISOString(),
          });
        }}
        onNotifyEmployee={() => {
          updateRequest({
            employeeNotifiedDate: new Date().toISOString(),
          });
          advanceStage('payroll_updated');
        }}
      />

      {/* ================================================================== */}
      {/* Payroll Section (Epic 15) */}
      {/* ================================================================== */}
      <PayrollSection
        ref={(el) => { sectionRefs.current[SECTION_IDS.payroll_updated] = el; }}
        request={request}
        employee={employee}
        employeeName={employeeName}
        canAct={canAct}
        onSubmitPayroll={(confirmedSalary) => {
          const now = new Date().toISOString();
          updateRequest({
            payrollSubmitted: true,
            payrollSubmittedDate: now,
            payrollSubmittedBy: currentUser?.id,
            newSalaryConfirmed: confirmedSalary,
          });
          // Complete the final stage in history
          const updatedHistory = request.stageHistory.map((s) =>
            s.stage === 'payroll_updated' ? { ...s, status: 'completed' as const, completedDate: now } : s
          );
          storage.updateIncreaseRequest(id!, { stageHistory: updatedHistory });
          // Update employee salary
          if (employee) {
            storage.updateEmployee(employee.id, { currentSalary: confirmedSalary });
          }
          // Create salary history record
          storage.createSalaryHistory({
            id: `sh-${Date.now()}`,
            employeeId: request.employeeId,
            previousSalary: request.currentSalary,
            newSalary: confirmedSalary,
            increasePercentage: request.agreedPercentage ?? request.increasePercentage,
            effectiveDate: request.effectiveDate,
            requestId: request.requestId,
          });
          refresh();
        }}
      />
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

// ---------------------------------------------------------------------------
// Client Approval Section
// ---------------------------------------------------------------------------

import { forwardRef } from 'react';

interface ClientApprovalProps {
  request: IncreaseRequest;
  employeeName: string;
  employee?: Employee;
  canAct: boolean;
  onApprove: () => void;
  onReject: (notes: string) => void;
  onAddNotes: (notes: string) => void;
}

const ClientApprovalSection = forwardRef<HTMLDivElement, ClientApprovalProps>(
  ({ request, employeeName, employee, canAct, onApprove, onReject, onAddNotes }, ref) => {
    const [rejectNotes, setRejectNotes] = useState('');
    const [contextNotes, setContextNotes] = useState(request.clientNotes ?? '');
    const [showRejectForm, setShowRejectForm] = useState(false);

    const isActive = request.currentStage === 'client_approval';
    const isPast = ALL_STAGES.indexOf(request.currentStage) > ALL_STAGES.indexOf('client_approval');

    return (
      <div ref={ref}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5 text-purple-600 dark:text-purple-400" />
              Client Approval
              {request.clientApprovalStatus === 'approved' && (
                <Badge className="bg-green-600 ml-2">Approved</Badge>
              )}
              {request.clientApprovalStatus === 'rejected' && (
                <Badge variant="destructive" className="ml-2">Rejected</Badge>
              )}
              {request.clientApprovalStatus === 'pending' && isPast && (
                <Badge variant="outline" className="ml-2">Skipped</Badge>
              )}
              {request.clientApprovalStatus === 'pending' && isActive && (
                <Badge variant="outline" className="ml-2">Awaiting Response</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Request details visible to client (Story 9.1) */}
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Employee</p>
                <p className="font-medium">{employeeName}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Current Salary</p>
                <p className="font-medium">{formatCurrency(request.currentSalary)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Proposed Increase</p>
                <p className="font-medium">{request.increasePercentage.toFixed(1)}%</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Proposed Salary</p>
                <p className="font-medium">{formatCurrency(request.proposedSalary)}</p>
              </div>
            </div>

            {/* Client response info (Story 9.3) */}
            {request.clientApprovalDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-3.5" />
                Response received: {formatDateTime(request.clientApprovalDate)}
              </div>
            )}

            {request.clientNotes && (
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground">Client/Supervisor Notes</p>
                <p className="mt-1 text-sm">{request.clientNotes}</p>
              </div>
            )}

            {/* Context notes (Story 9.4) */}
            {canAct && isActive && (
              <div className="space-y-2">
                <Label>Add Context Notes (visible to client)</Label>
                <div className="flex gap-2">
                  <Textarea
                    value={contextNotes}
                    onChange={(e) => setContextNotes(e.target.value)}
                    placeholder="Add context for the client..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-end"
                    onClick={() => onAddNotes(contextNotes)}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}

            {/* Approve/Reject buttons */}
            {canAct && isActive && request.clientApprovalStatus === 'pending' && (
              <>
                <Separator />
                {showRejectForm ? (
                  <div className="space-y-3">
                    <Label>Rejection Reason</Label>
                    <Textarea
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Explain the reason for rejection..."
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={() => { onReject(rejectNotes); setShowRejectForm(false); }}
                        disabled={!rejectNotes.trim()}
                      >
                        Confirm Rejection
                      </Button>
                      <Button variant="outline" onClick={() => setShowRejectForm(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button onClick={onApprove}>
                      <CheckCircle2 className="size-4" data-icon="inline-start" />
                      Approve (Client)
                    </Button>
                    <Button variant="destructive" onClick={() => setShowRejectForm(true)}>
                      <XCircle className="size-4" data-icon="inline-start" />
                      Reject
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
);
ClientApprovalSection.displayName = 'ClientApprovalSection';

// ---------------------------------------------------------------------------
// CSM Negotiation Section
// ---------------------------------------------------------------------------

interface CSMNegotiationProps {
  request: IncreaseRequest;
  canAct: boolean;
  currentUser: ReturnType<typeof useAuthStore.getState>['currentUser'];
  onAddEntry: (entry: NegotiationEntry) => void;
  onCloseNegotiation: (agreedPct: number) => void;
}

const CSMNegotiationSection = forwardRef<HTMLDivElement, CSMNegotiationProps>(
  ({ request, canAct, currentUser, onAddEntry, onCloseNegotiation }, ref) => {
    const [newPct, setNewPct] = useState('');
    const [newNotes, setNewNotes] = useState('');
    const [agreedPct, setAgreedPct] = useState(String(request.agreedPercentage ?? request.increasePercentage));

    const isActive = request.currentStage === 'csm_negotiation';
    const isReached = ALL_STAGES.indexOf(request.currentStage) >= ALL_STAGES.indexOf('csm_negotiation');

    function handleAddEntry() {
      if (!newPct || !currentUser) return;
      const entry: NegotiationEntry = {
        id: `neg-${Date.now()}`,
        proposedPercentage: parseFloat(newPct),
        date: new Date().toISOString(),
        notes: newNotes,
        addedBy: currentUser.name,
      };
      onAddEntry(entry);
      setNewPct('');
      setNewNotes('');
    }

    return (
      <div ref={ref}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5 text-yellow-600 dark:text-yellow-400" />
              CSM Negotiation
              {request.negotiationLocked && <Lock className="size-4 text-muted-foreground" />}
              {request.agreedPercentage != null && (
                <Badge className="bg-green-600 ml-2">Agreed: {request.agreedPercentage.toFixed(1)}%</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isReached && (
              <p className="text-sm text-muted-foreground">This section will be available after client approval.</p>
            )}

            {isReached && (
              <>
                {/* Agreed percentage (Story 10.3) */}
                {request.agreedPercentage != null && (
                  <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/40">
                    <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-300">
                        Agreed Percentage: {request.agreedPercentage.toFixed(1)}%
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        New salary: {formatCurrency(Math.round(request.currentSalary * (1 + request.agreedPercentage / 100)))}
                      </p>
                    </div>
                  </div>
                )}

                {/* Negotiation log (Story 10.2) */}
                {request.negotiations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Negotiation History</p>
                    <div className="space-y-2">
                      {request.negotiations.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                          <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                            <User className="size-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{entry.addedBy}</span>
                              <span className="text-xs text-muted-foreground">{formatDateTime(entry.date)}</span>
                            </div>
                            <p className="mt-0.5">
                              Proposed: <span className="font-medium">{entry.proposedPercentage.toFixed(1)}%</span>
                            </p>
                            {entry.notes && <p className="mt-1 text-muted-foreground">{entry.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add entry form (Story 10.1) */}
                {canAct && isActive && !request.negotiationLocked && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Add Negotiation Entry</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Proposed %</Label>
                          <Input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={newPct}
                            onChange={(e) => setNewPct(e.target.value)}
                            placeholder="e.g., 8.5"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Notes</Label>
                          <Input
                            value={newNotes}
                            onChange={(e) => setNewNotes(e.target.value)}
                            placeholder="Optional notes..."
                          />
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleAddEntry} disabled={!newPct}>
                        <Plus className="size-4" data-icon="inline-start" />
                        Add Entry
                      </Button>
                    </div>

                    <Separator />

                    {/* Close Negotiation */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Close Negotiation</p>
                      <div className="flex items-end gap-3">
                        <div className="space-y-1">
                          <Label>Agreed Percentage</Label>
                          <Input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={agreedPct}
                            onChange={(e) => setAgreedPct(e.target.value)}
                            className="w-32"
                          />
                        </div>
                        <Button onClick={() => onCloseNegotiation(parseFloat(agreedPct))} disabled={!agreedPct}>
                          <Lock className="size-4" data-icon="inline-start" />
                          Close Negotiation
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Locked notice (Story 10.4) */}
                {request.negotiationLocked && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="size-3.5" />
                    Negotiation log is locked after client approval was confirmed.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
);
CSMNegotiationSection.displayName = 'CSMNegotiationSection';

// ---------------------------------------------------------------------------
// Finance Approval Section
// ---------------------------------------------------------------------------

interface FinanceApprovalProps {
  request: IncreaseRequest;
  evalGateCleared: boolean;
  canAct: boolean;
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
}

const FinanceApprovalSection = forwardRef<HTMLDivElement, FinanceApprovalProps>(
  ({ request, evalGateCleared, canAct, onApprove, onReject }, ref) => {
    const [comment, setComment] = useState('');

    const isActive = request.currentStage === 'finance_approval';
    const isReached = ALL_STAGES.indexOf(request.currentStage) >= ALL_STAGES.indexOf('finance_approval');
    const canAction = canAct && isActive && evalGateCleared && request.financeApprovalStatus === 'pending';

    return (
      <div ref={ref}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="size-5 text-orange-600 dark:text-orange-400" />
              Finance Approval
              {request.financeApprovalStatus === 'approved' && (
                <Badge className="bg-green-600 ml-2">Approved</Badge>
              )}
              {request.financeApprovalStatus === 'rejected' && (
                <Badge variant="destructive" className="ml-2">Rejected</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isReached && (
              <p className="text-sm text-muted-foreground">This section will be available after CSM negotiation.</p>
            )}

            {isReached && (
              <>
                {/* Request summary (Story 11.2) */}
                <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Current Salary</p>
                    <p className="font-medium">{formatCurrency(request.currentSalary)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Negotiated %</p>
                    <p className="font-medium">{(request.agreedPercentage ?? request.increasePercentage).toFixed(1)}%</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">New Salary</p>
                    <p className="font-medium">{formatCurrency(request.proposedSalary)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Effective Date</p>
                    <p className="font-medium">{formatDate(request.effectiveDate)}</p>
                  </div>
                </div>

                {!evalGateCleared && isActive && (
                  <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    <AlertTriangle className="size-4" />
                    Finance approval is disabled until the evaluation gate is cleared.
                  </div>
                )}

                {request.financeComment && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground">Finance Comment</p>
                    <p className="mt-1 text-sm">{request.financeComment}</p>
                    {request.financeApprovalDate && (
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(request.financeApprovalDate)}</p>
                    )}
                  </div>
                )}

                {/* Approve/Reject (Story 11.3) */}
                {canAction && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label>Comment (required)</Label>
                        <Textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Provide your review comments..."
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button onClick={() => { onApprove(comment); setComment(''); }} disabled={!comment.trim()}>
                          <CheckCircle2 className="size-4" data-icon="inline-start" />
                          Approve (Finance)
                        </Button>
                        <Button variant="destructive" onClick={() => { onReject(comment); setComment(''); }} disabled={!comment.trim()}>
                          <XCircle className="size-4" data-icon="inline-start" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
);
FinanceApprovalSection.displayName = 'FinanceApprovalSection';

// ---------------------------------------------------------------------------
// HR Review (Sam) Section
// ---------------------------------------------------------------------------

interface HRReviewProps {
  request: IncreaseRequest;
  evalGateCleared: boolean;
  canAct: boolean;
  supervisor?: { id: string; name: string };
  employeeName: string;
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
}

const HRReviewSection = forwardRef<HTMLDivElement, HRReviewProps>(
  ({ request, evalGateCleared, canAct, onApprove, onReject }, ref) => {
    const [comment, setComment] = useState('');

    const isActive = request.currentStage === 'hr_review';
    const isReached = ALL_STAGES.indexOf(request.currentStage) >= ALL_STAGES.indexOf('hr_review');
    const canAction = canAct && isActive && evalGateCleared && request.hrApprovalStatus === 'pending';

    return (
      <div ref={ref}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-indigo-600 dark:text-indigo-400" />
              HR Review (Sam)
              {request.hrApprovalStatus === 'approved' && (
                <Badge className="bg-green-600 ml-2">Approved</Badge>
              )}
              {request.hrApprovalStatus === 'rejected' && (
                <Badge variant="destructive" className="ml-2">Rejected</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isReached && (
              <p className="text-sm text-muted-foreground">This section will be available after finance approval.</p>
            )}

            {isReached && (
              <>
                {/* Dual approval status (Story 11.6) */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    {request.financeApprovalStatus === 'approved' ? (
                      <CheckCircle2 className="size-4 text-green-600" />
                    ) : (
                      <Clock className="size-4 text-muted-foreground" />
                    )}
                    <span>Finance: <span className="font-medium capitalize">{request.financeApprovalStatus}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {request.hrApprovalStatus === 'approved' ? (
                      <CheckCircle2 className="size-4 text-green-600" />
                    ) : (
                      <Clock className="size-4 text-muted-foreground" />
                    )}
                    <span>HR (Sam): <span className="font-medium capitalize">{request.hrApprovalStatus}</span></span>
                  </div>
                </div>

                {/* Full request timeline (Story 11.5) */}
                <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Current Salary</p>
                    <p className="font-medium">{formatCurrency(request.currentSalary)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Final %</p>
                    <p className="font-medium">{(request.agreedPercentage ?? request.increasePercentage).toFixed(1)}%</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">New Salary</p>
                    <p className="font-medium">{formatCurrency(request.proposedSalary)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Effective Date</p>
                    <p className="font-medium">{formatDate(request.effectiveDate)}</p>
                  </div>
                </div>

                {!evalGateCleared && isActive && (
                  <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    <AlertTriangle className="size-4" />
                    HR review is disabled until the evaluation gate is cleared.
                  </div>
                )}

                {request.hrComment && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground">HR Comment</p>
                    <p className="mt-1 text-sm">{request.hrComment}</p>
                    {request.hrApprovalDate && (
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(request.hrApprovalDate)}</p>
                    )}
                  </div>
                )}

                {/* Approve/Reject */}
                {canAction && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label>Comment (required)</Label>
                        <Textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Provide your final review comments..."
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button onClick={() => { onApprove(comment); setComment(''); }} disabled={!comment.trim()}>
                          <CheckCircle2 className="size-4" data-icon="inline-start" />
                          Approve (HR)
                        </Button>
                        <Button variant="destructive" onClick={() => { onReject(comment); setComment(''); }} disabled={!comment.trim()}>
                          <XCircle className="size-4" data-icon="inline-start" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {!canAct && isActive && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="size-4" />
                    Only admin users (Sam) can approve this stage.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
);
HRReviewSection.displayName = 'HRReviewSection';

// ---------------------------------------------------------------------------
// Supervisor Notification Section
// ---------------------------------------------------------------------------

interface SupervisorNotificationProps {
  request: IncreaseRequest;
  supervisor?: { id: string; name: string };
  employeeName: string;
  canAct: boolean;
  onNotifySupervisor: () => void;
  onNotifyEmployee: () => void;
}

const SupervisorNotificationSection = forwardRef<HTMLDivElement, SupervisorNotificationProps>(
  ({ request, supervisor, employeeName, canAct, onNotifySupervisor, onNotifyEmployee }, ref) => {
    const isActive = request.currentStage === 'supervisor_notified';
    const isReached = ALL_STAGES.indexOf(request.currentStage) >= ALL_STAGES.indexOf('supervisor_notified');

    return (
      <div ref={ref}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5 text-teal-600 dark:text-teal-400" />
              Supervisor & Employee Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isReached && (
              <p className="text-sm text-muted-foreground">This section will be available after HR review.</p>
            )}

            {isReached && (
              <>
                {/* Checklist */}
                <div className="space-y-3">
                  {/* Supervisor notified (Story 14.1) */}
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <div className={`flex size-6 items-center justify-center rounded-full ${
                      request.supervisorNotified ? 'bg-green-100 dark:bg-green-900/40' : 'bg-muted'
                    }`}>
                      {request.supervisorNotified ? (
                        <Check className="size-3.5 text-green-600 dark:text-green-400" />
                      ) : (
                        <span className="size-2 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Notify Supervisor {supervisor ? `(${supervisor.name})` : ''}
                      </p>
                      {request.supervisorNotifiedDate && (
                        <p className="text-xs text-muted-foreground">
                          Notified on {formatDateTime(request.supervisorNotifiedDate)}
                        </p>
                      )}
                    </div>
                    {canAct && isActive && !request.supervisorNotified && (
                      <Button size="sm" onClick={onNotifySupervisor}>
                        <Send className="size-4" data-icon="inline-start" />
                        Notify
                      </Button>
                    )}
                  </div>

                  {/* Employee notified (Story 14.2) */}
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <div className={`flex size-6 items-center justify-center rounded-full ${
                      request.employeeNotifiedDate ? 'bg-green-100 dark:bg-green-900/40' : 'bg-muted'
                    }`}>
                      {request.employeeNotifiedDate ? (
                        <Check className="size-3.5 text-green-600 dark:text-green-400" />
                      ) : (
                        <span className="size-2 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Notify Employee ({employeeName})</p>
                      {request.employeeNotifiedDate && (
                        <p className="text-xs text-muted-foreground">
                          Notified on {formatDateTime(request.employeeNotifiedDate)}
                        </p>
                      )}
                    </div>
                    {canAct && isActive && request.supervisorNotified && !request.employeeNotifiedDate && (
                      <Button size="sm" onClick={onNotifyEmployee}>
                        <Send className="size-4" data-icon="inline-start" />
                        Confirm & Advance
                      </Button>
                    )}
                  </div>
                </div>

                {/* Block payroll notice (Story 14.4) */}
                {isActive && !request.employeeNotifiedDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="size-4" />
                    Payroll submission is blocked until both supervisor and employee have been notified.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
);
SupervisorNotificationSection.displayName = 'SupervisorNotificationSection';

// ---------------------------------------------------------------------------
// Payroll Section
// ---------------------------------------------------------------------------

interface PayrollProps {
  request: IncreaseRequest;
  employee?: Employee;
  employeeName: string;
  canAct: boolean;
  onSubmitPayroll: (confirmedSalary: number) => void;
}

const PayrollSection = forwardRef<HTMLDivElement, PayrollProps>(
  ({ request, employee, employeeName, canAct, onSubmitPayroll }, ref) => {
    const [confirmedSalary, setConfirmedSalary] = useState(String(request.proposedSalary));
    const [showConfirm, setShowConfirm] = useState(false);

    const isActive = request.currentStage === 'payroll_updated';
    const isReached = ALL_STAGES.indexOf(request.currentStage) >= ALL_STAGES.indexOf('payroll_updated');
    const canSubmit = canAct && isActive && !request.payrollSubmitted;

    return (
      <div ref={ref}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-5 text-green-600 dark:text-green-400" />
              Payroll Update
              {request.payrollSubmitted && (
                <Badge className="bg-green-600 ml-2">Submitted</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isReached && (
              <p className="text-sm text-muted-foreground">This section will be available after supervisor and employee notifications.</p>
            )}

            {isReached && (
              <>
                {/* Read-only summary for completed record (Story 15.5) */}
                {request.payrollSubmitted ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/40">
                      <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-300">
                          Payroll Updated Successfully
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Reference: {request.requestId}-PAY
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Employee</p>
                        <p className="font-medium">{employeeName}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Previous Salary</p>
                        <p className="font-medium">{formatCurrency(request.currentSalary)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">New Salary</p>
                        <p className="font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(request.newSalaryConfirmed ?? request.proposedSalary)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Submitted</p>
                        <p className="font-medium">
                          {request.payrollSubmittedDate ? formatDateTime(request.payrollSubmittedDate) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Pre-filled payroll form (Story 15.1) */}
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Employee</p>
                        <p className="font-medium">{employeeName}</p>
                        <p className="text-xs text-muted-foreground">{employee?.employeeId}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Effective Date</p>
                        <p className="font-medium">{formatDate(request.effectiveDate)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Previous Salary</p>
                        <p className="font-medium">{formatCurrency(request.currentSalary)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Increase</p>
                        <p className="font-medium">
                          {(request.agreedPercentage ?? request.increasePercentage).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Confirm amount (Story 15.2) */}
                    {canSubmit && (
                      <>
                        <Separator />
                        {!showConfirm ? (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label>Confirmed New Salary</Label>
                              <Input
                                type="number"
                                value={confirmedSalary}
                                onChange={(e) => setConfirmedSalary(e.target.value)}
                                className="w-48"
                              />
                            </div>
                            <Button onClick={() => setShowConfirm(true)} disabled={!confirmedSalary}>
                              <CreditCard className="size-4" data-icon="inline-start" />
                              Submit to Payroll
                            </Button>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                            <p className="text-sm font-medium">Confirm Payroll Submission</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              You are about to update {employeeName}'s salary from{' '}
                              {formatCurrency(request.currentSalary)} to{' '}
                              <span className="font-medium text-foreground">{formatCurrency(parseInt(confirmedSalary))}</span>.
                              This action cannot be undone.
                            </p>
                            <div className="mt-3 flex gap-2">
                              <Button onClick={() => {
                                onSubmitPayroll(parseInt(confirmedSalary));
                                setShowConfirm(false);
                              }}>
                                <CheckCircle2 className="size-4" data-icon="inline-start" />
                                Confirm
                              </Button>
                              <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
);
PayrollSection.displayName = 'PayrollSection';

export default IncreaseDetailPage;
