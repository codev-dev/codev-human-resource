// ============================================================================
// HR (Sam) Approval Queue (Epic 11, Stories 11.4-11.6)
// ============================================================================
//
// Story 11.4: List requests pending HR sign-off
// Story 11.5: Full review screen with timeline, eval, negotiation, salary chart
// Story 11.6: Dual approval indicators (Finance / Sam)
// ============================================================================

import { useState, useMemo } from 'react';
import { storage } from '@/lib/storage';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import type { IncreaseRequest, Employee, Evaluation, SalaryHistory } from '@/types';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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

import { ProgressStepper } from '@/components/increase/progress-stepper';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Inbox,
  DollarSign,
  TrendingUp,
  Shield,
  MessageSquare,
  Calendar,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ApprovalIndicator({
  label,
  status,
}: {
  label: string;
  status: 'pending' | 'approved' | 'rejected';
}) {
  return (
    <div className="flex items-center gap-2">
      {status === 'approved' ? (
        <CheckCircle2 className="size-5 text-emerald-500" />
      ) : status === 'rejected' ? (
        <XCircle className="size-5 text-red-500" />
      ) : (
        <div className="size-5 rounded-full border-2 border-muted-foreground/30" />
      )}
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p
          className={`text-xs capitalize ${
            status === 'approved'
              ? 'text-emerald-600 dark:text-emerald-400'
              : status === 'rejected'
                ? 'text-red-600 dark:text-red-400'
                : 'text-muted-foreground'
          }`}
        >
          {status}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function HRApprovalPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { addNotification } = useNotificationStore();

  // ---- Data ----
  const [requests, setRequests] = useState<IncreaseRequest[]>(() =>
    storage.getIncreaseRequests(),
  );
  const employees = useMemo(() => storage.getEmployees(), []);
  const evaluations = useMemo(() => storage.getEvaluations(), []);
  const allSalaryHistory = useMemo(() => storage.getSalaryHistory(), []);
  const users = useMemo(() => storage.getUsers(), []);

  // ---- Pending queue ----
  const pendingRequests = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.hrApprovalStatus === 'pending' && r.currentStage === 'hr_review',
      ),
    [requests],
  );

  // ---- Expanded rows ----
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ---- Dialog state ----
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject'>('approve');
  const [dialogRequestId, setDialogRequestId] = useState('');
  const [comment, setComment] = useState('');

  // ---- Helpers ----
  const getEmployee = (empId: string): Employee | undefined =>
    employees.find((e) => e.id === empId);
  const getEvaluation = (evalId?: string): Evaluation | undefined =>
    evalId ? evaluations.find((e) => e.id === evalId) : undefined;
  const getUserName = (userId: string) =>
    users.find((u) => u.id === userId)?.name ?? userId;
  const getEmployeeSalaryHistory = (empId: string): SalaryHistory[] =>
    allSalaryHistory
      .filter((sh) => sh.employeeId === empId)
      .sort(
        (a, b) =>
          new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime(),
      );

  // Build chart data for salary trend
  const buildChartData = (empId: string, currentSalary: number) => {
    const history = getEmployeeSalaryHistory(empId);
    const points: { date: string; salary: number }[] = [];

    if (history.length > 0) {
      // Start with first record's previous salary
      points.push({
        date: history[0].effectiveDate,
        salary: history[0].previousSalary,
      });
      history.forEach((sh) => {
        points.push({ date: sh.effectiveDate, salary: sh.newSalary });
      });
    }

    // Always include current point
    if (points.length === 0 || points[points.length - 1].salary !== currentSalary) {
      points.push({
        date: new Date().toISOString().split('T')[0],
        salary: currentSalary,
      });
    }

    return points;
  };

  // ---- Handlers ----
  const openDialog = (requestId: string, action: 'approve' | 'reject') => {
    setDialogRequestId(requestId);
    setDialogAction(action);
    setComment('');
    setDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!comment.trim()) return;

    const req = requests.find((r) => r.id === dialogRequestId);
    if (!req) return;

    const now = new Date().toISOString().split('T')[0];
    const emp = getEmployee(req.employeeId);

    if (dialogAction === 'approve') {
      // Advance to supervisor_notified
      const updatedHistory = req.stageHistory.map((entry) => {
        if (entry.stage === 'hr_review') {
          return { ...entry, status: 'completed' as const, completedDate: now };
        }
        if (entry.stage === 'supervisor_notified') {
          return {
            ...entry,
            status: 'active' as const,
            enteredDate: now,
            ownerId: emp?.supervisorId,
            ownerName: emp?.supervisorId
              ? getUserName(emp.supervisorId)
              : undefined,
          };
        }
        return entry;
      });

      storage.updateIncreaseRequest(dialogRequestId, {
        hrApprovalStatus: 'approved',
        hrApproverId: currentUser?.id,
        hrApprovalDate: now,
        hrComment: comment.trim(),
        currentStage: 'supervisor_notified',
        stageHistory: updatedHistory,
        updatedAt: new Date().toISOString(),
      });

      // Create notification for supervisor
      if (emp?.supervisorId) {
        const notification = {
          id: `notif-${Date.now()}`,
          userId: emp.supervisorId,
          title: 'Salary Increase Approved',
          message: `The salary increase for ${emp.firstName} ${emp.lastName} has been approved and requires your acknowledgment.`,
          type: 'success' as const,
          read: false,
          link: `/increase-requests/${req.id}`,
          createdAt: new Date().toISOString(),
        };
        addNotification(notification);
      }
    } else {
      storage.updateIncreaseRequest(dialogRequestId, {
        hrApprovalStatus: 'rejected',
        hrApproverId: currentUser?.id,
        hrApprovalDate: now,
        hrComment: comment.trim(),
        updatedAt: new Date().toISOString(),
      });
    }

    setRequests(storage.getIncreaseRequests());
    setDialogOpen(false);
  };

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <CheckSquare className="size-6 text-primary" />
          HR Approval Queue
        </h1>
        <p className="text-muted-foreground mt-1">
          Final HR review and approval for salary increase requests.
        </p>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-3">
        <Badge variant="secondary">
          {pendingRequests.length} Pending
        </Badge>
      </div>

      {/* Story 11.4 — Queue */}
      {pendingRequests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Inbox className="mx-auto size-12 text-muted-foreground/40" />
            <p className="mt-3 text-lg font-medium">All caught up</p>
            <p className="text-sm text-muted-foreground">
              There are no requests pending HR approval at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((req) => {
            const emp = getEmployee(req.employeeId);
            const eval_ = getEvaluation(req.linkedEvalId);
            const isExpanded = expandedId === req.id;
            const chartData = buildChartData(
              req.employeeId,
              req.currentSalary,
            );
            const salaryHistory = getEmployeeSalaryHistory(req.employeeId);

            return (
              <Card key={req.id}>
                {/* Collapsed header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  className="w-full text-left"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <CardTitle className="text-base">
                          {emp
                            ? `${emp.firstName} ${emp.lastName}`
                            : req.employeeId}
                        </CardTitle>
                        <Badge variant="outline" className="font-mono">
                          {req.requestId}
                        </Badge>
                        {emp && (
                          <span className="text-sm text-muted-foreground">
                            {emp.department} / {emp.position}
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="size-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="size-5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <CardDescription className="flex flex-wrap gap-4 mt-1">
                      <span>
                        Current: ${req.currentSalary.toLocaleString()}
                      </span>
                      <span>
                        Negotiated: {req.agreedPercentage ?? req.increasePercentage}%
                      </span>
                      {eval_ && (
                        <span>
                          Eval: {eval_.totalScore}/{eval_.maxScore}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                </button>

                {/* Story 11.5 — Full review */}
                {isExpanded && (
                  <CardContent className="space-y-6 border-t pt-6">
                    {/* Story 11.6 — Dual approval indicators */}
                    <div className="flex flex-wrap gap-6">
                      <ApprovalIndicator
                        label="Finance Approval"
                        status={req.financeApprovalStatus}
                      />
                      <ApprovalIndicator
                        label="HR Approval (Sam)"
                        status={req.hrApprovalStatus}
                      />
                    </div>

                    {/* Finance comment if available */}
                    {req.financeComment && (
                      <div className="rounded-md border bg-muted/30 px-4 py-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <Shield className="size-3" />
                          Finance Comment
                        </p>
                        <p className="text-sm">{req.financeComment}</p>
                      </div>
                    )}

                    <Separator />

                    {/* Complete request timeline */}
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-1.5 mb-3">
                        <Calendar className="size-4" />
                        Request Timeline
                      </h4>
                      <ProgressStepper
                        stageHistory={req.stageHistory}
                        currentStage={req.currentStage}
                        requestId={req.id}
                        variant="full"
                      />
                    </div>

                    <Separator />

                    {/* Employee info */}
                    {emp && (
                      <>
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Employee Information
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Name
                              </p>
                              <p className="text-sm font-medium">
                                {emp.firstName} {emp.lastName}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Employee ID
                              </p>
                              <p className="text-sm font-medium">
                                {emp.employeeId}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Position
                              </p>
                              <p className="text-sm font-medium">
                                {emp.position}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Hire Date
                              </p>
                              <p className="text-sm font-medium">
                                {new Date(emp.hireDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Evaluation summary */}
                    {eval_ && (
                      <>
                        <div>
                          <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                            <TrendingUp className="size-4" />
                            Evaluation Summary
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Score
                              </p>
                              <p className="text-lg font-bold">
                                {eval_.totalScore}/{eval_.maxScore}
                                <span className="ml-1 text-sm font-normal text-muted-foreground">
                                  (
                                  {Math.round(
                                    (eval_.totalScore / eval_.maxScore) * 100,
                                  )}
                                  %)
                                </span>
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Type
                              </p>
                              <p className="text-sm font-medium capitalize">
                                {eval_.type}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Status
                              </p>
                              <Badge variant="secondary" className="capitalize">
                                {eval_.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Negotiation result */}
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                        <MessageSquare className="size-4" />
                        Negotiation Result
                      </h4>
                      {req.agreedPercentage != null && (
                        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50/50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                            Agreed Increase: {req.agreedPercentage}%
                          </p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            New salary: $
                            {Math.round(
                              req.currentSalary *
                                (1 + req.agreedPercentage / 100),
                            ).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {req.negotiations.length > 0 && (
                        <div className="space-y-1.5">
                          {req.negotiations.map((neg) => (
                            <div
                              key={neg.id}
                              className="flex flex-wrap items-center gap-2 text-sm"
                            >
                              <Badge variant="outline">
                                {neg.proposedPercentage}%
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(neg.date).toLocaleDateString()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                by {getUserName(neg.addedBy)}
                              </span>
                              <span className="text-muted-foreground">
                                - {neg.notes}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Salary history with trend chart */}
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-1.5 mb-3">
                        <DollarSign className="size-4" />
                        Salary History
                      </h4>

                      {chartData.length > 1 && (
                        <div className="mb-4 h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                className="stroke-muted-foreground/20"
                              />
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11 }}
                                tickFormatter={(val: string) =>
                                  new Date(val).toLocaleDateString(undefined, {
                                    month: 'short',
                                    year: '2-digit',
                                  })
                                }
                                className="text-muted-foreground"
                              />
                              <YAxis
                                tick={{ fontSize: 11 }}
                                tickFormatter={(val: number) =>
                                  `$${(val / 1000).toFixed(0)}k`
                                }
                                className="text-muted-foreground"
                              />
                              <Tooltip
                                formatter={(val: number) => [
                                  `$${val.toLocaleString()}`,
                                  'Salary',
                                ]}
                                labelFormatter={(label: string) =>
                                  new Date(label).toLocaleDateString()
                                }
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

                      {salaryHistory.length > 0 ? (
                        <div className="space-y-1">
                          {salaryHistory.map((sh) => (
                            <div
                              key={sh.id}
                              className="flex flex-wrap items-center gap-2 text-sm"
                            >
                              <span className="text-xs text-muted-foreground">
                                {new Date(
                                  sh.effectiveDate,
                                ).toLocaleDateString()}
                              </span>
                              <span>
                                ${sh.previousSalary.toLocaleString()} &rarr; $
                                {sh.newSalary.toLocaleString()}
                              </span>
                              <Badge variant="outline">
                                +{sh.increasePercentage}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No salary history records.
                        </p>
                      )}
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => openDialog(req.id, 'approve')}
                      >
                        <CheckCircle2 className="size-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => openDialog(req.id, 'reject')}
                      >
                        <XCircle className="size-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Approve / Reject Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction === 'approve'
                ? 'Approve Request (HR)'
                : 'Reject Request (HR)'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === 'approve'
                ? 'This will advance the request to notify the supervisor. Please provide a comment.'
                : 'This will reject the request at the HR stage. Please provide a reason.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="hr-comment">
              Comment <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="hr-comment"
              placeholder={
                dialogAction === 'approve'
                  ? 'e.g. Aligned with performance and market data. Approved.'
                  : 'e.g. Does not align with current compensation band.'
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={dialogAction === 'reject' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={!comment.trim()}
            >
              {dialogAction === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default HRApprovalPage;
