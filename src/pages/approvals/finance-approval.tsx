// ============================================================================
// Finance Approval Queue (Epic 11, Stories 11.1-11.3)
// ============================================================================
//
// Story 11.1: List pending finance-review requests in a table
// Story 11.2: Expandable row with full request details
// Story 11.3: Approve/Reject with required comment (AlertDialog)
// ============================================================================

import { useState, useMemo } from 'react';
import { storage } from '@/lib/storage';
import { useAuthStore } from '@/stores/auth-store';
import type { IncreaseRequest, Employee, Evaluation } from '@/types';

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

import {
  DollarSign,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  FileText,
  Inbox,
  Calendar,
  Percent,
  TrendingUp,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function FinanceApprovalPage() {
  const currentUser = useAuthStore((s) => s.currentUser);

  // ---- Data ----
  const [requests, setRequests] = useState<IncreaseRequest[]>(() =>
    storage.getIncreaseRequests(),
  );
  const employees = useMemo(() => storage.getEmployees(), []);
  const evaluations = useMemo(() => storage.getEvaluations(), []);
  const salaryHistories = useMemo(() => storage.getSalaryHistory(), []);
  const users = useMemo(() => storage.getUsers(), []);

  // ---- Pending queue ----
  const pendingRequests = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.financeApprovalStatus === 'pending' &&
          r.currentStage === 'finance_approval',
      ),
    [requests],
  );

  // ---- Expanded rows ----
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ---- Dialog state ----
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject'>('approve');
  const [dialogRequestId, setDialogRequestId] = useState<string>('');
  const [comment, setComment] = useState('');

  // ---- Helpers ----
  const getEmployee = (empId: string): Employee | undefined =>
    employees.find((e) => e.id === empId);
  const getEvaluation = (evalId?: string): Evaluation | undefined =>
    evalId ? evaluations.find((e) => e.id === evalId) : undefined;
  const getUserName = (userId: string) =>
    users.find((u) => u.id === userId)?.name ?? userId;

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

    if (dialogAction === 'approve') {
      // Advance to hr_review
      const updatedHistory = req.stageHistory.map((entry) => {
        if (entry.stage === 'finance_approval') {
          return { ...entry, status: 'completed' as const, completedDate: now };
        }
        if (entry.stage === 'hr_review') {
          return {
            ...entry,
            status: 'active' as const,
            enteredDate: now,
            ownerId: 'usr-001',
            ownerName: 'Sam Rivera',
          };
        }
        return entry;
      });

      storage.updateIncreaseRequest(dialogRequestId, {
        financeApprovalStatus: 'approved',
        financeApproverId: currentUser?.id,
        financeApprovalDate: now,
        financeComment: comment.trim(),
        currentStage: 'hr_review',
        stageHistory: updatedHistory,
        updatedAt: new Date().toISOString(),
      });
    } else {
      storage.updateIncreaseRequest(dialogRequestId, {
        financeApprovalStatus: 'rejected',
        financeApproverId: currentUser?.id,
        financeApprovalDate: now,
        financeComment: comment.trim(),
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
          <DollarSign className="size-6 text-primary" />
          Finance Approval Queue
        </h1>
        <p className="text-muted-foreground mt-1">
          Review and approve salary increase requests from a finance perspective.
        </p>
      </div>

      {/* Summary badges */}
      <div className="flex items-center gap-3">
        <Badge variant="secondary">
          {pendingRequests.length} Pending
        </Badge>
      </div>

      {/* Story 11.1 — Queue table */}
      {pendingRequests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Inbox className="mx-auto size-12 text-muted-foreground/40" />
            <p className="mt-3 text-lg font-medium">All caught up</p>
            <p className="text-sm text-muted-foreground">
              There are no requests pending finance approval at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Table header */}
            <div className="hidden md:grid md:grid-cols-[1fr_1fr_0.8fr_0.8fr_0.6fr_0.6fr_0.6fr_0.8fr_auto] gap-2 border-b px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Request ID</span>
              <span>Employee</span>
              <span>Department</span>
              <span>Current Salary</span>
              <span>Proposed %</span>
              <span>Negotiated %</span>
              <span>Eval Score</span>
              <span>Created</span>
              <span></span>
            </div>

            {/* Rows */}
            {pendingRequests.map((req) => {
              const emp = getEmployee(req.employeeId);
              const eval_ = getEvaluation(req.linkedEvalId);
              const isExpanded = expandedId === req.id;
              const empSalaryHistory = salaryHistories.filter(
                (sh) => sh.employeeId === req.employeeId,
              );

              return (
                <div key={req.id} className="border-b last:border-b-0">
                  {/* Main row */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    className="w-full text-left grid grid-cols-1 md:grid-cols-[1fr_1fr_0.8fr_0.8fr_0.6fr_0.6fr_0.6fr_0.8fr_auto] gap-2 px-4 py-3 hover:bg-muted/50 transition-colors items-center"
                  >
                    <span className="font-mono text-sm font-medium">
                      <span className="md:hidden text-xs text-muted-foreground mr-1">ID:</span>
                      {req.requestId}
                    </span>
                    <span className="text-sm">
                      <span className="md:hidden text-xs text-muted-foreground mr-1">Employee:</span>
                      {emp ? `${emp.firstName} ${emp.lastName}` : req.employeeId}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      <span className="md:hidden text-xs text-muted-foreground mr-1">Dept:</span>
                      {emp?.department ?? 'N/A'}
                    </span>
                    <span className="text-sm font-medium">
                      <span className="md:hidden text-xs text-muted-foreground mr-1">Salary:</span>
                      ${req.currentSalary.toLocaleString()}
                    </span>
                    <span className="text-sm">
                      <span className="md:hidden text-xs text-muted-foreground mr-1">Proposed:</span>
                      {req.increasePercentage}%
                    </span>
                    <span className="text-sm font-medium text-primary">
                      <span className="md:hidden text-xs text-muted-foreground mr-1">Negotiated:</span>
                      {req.agreedPercentage != null
                        ? `${req.agreedPercentage}%`
                        : '--'}
                    </span>
                    <span className="text-sm">
                      <span className="md:hidden text-xs text-muted-foreground mr-1">Score:</span>
                      {eval_
                        ? `${eval_.totalScore}/${eval_.maxScore}`
                        : '--'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      <span className="md:hidden text-xs mr-1">Created:</span>
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex justify-end">
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </span>
                  </button>

                  {/* Story 11.2 — Expanded details */}
                  {isExpanded && (
                    <div className="border-t bg-muted/20 px-4 py-5 space-y-5">
                      {/* Request summary */}
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                          <FileText className="size-4" />
                          Request Summary
                        </h4>
                        <p className="text-sm text-muted-foreground">{req.notes}</p>
                      </div>

                      <Separator />

                      {/* Evaluation summary */}
                      {eval_ && (
                        <>
                          <div>
                            <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                              <TrendingUp className="size-4" />
                              Linked Evaluation
                            </h4>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Score
                                </p>
                                <p className="font-medium">
                                  {eval_.totalScore} / {eval_.maxScore} (
                                  {Math.round(
                                    (eval_.totalScore / eval_.maxScore) * 100,
                                  )}
                                  %)
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Type
                                </p>
                                <p className="font-medium capitalize">
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

                      {/* Negotiation history */}
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                          <Percent className="size-4" />
                          Negotiation History
                        </h4>
                        {req.agreedPercentage != null && (
                          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2">
                            Agreed: {req.agreedPercentage}%
                          </p>
                        )}
                        {req.negotiations.length > 0 ? (
                          <div className="space-y-2">
                            {req.negotiations.map((neg) => (
                              <div
                                key={neg.id}
                                className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm"
                              >
                                <Badge variant="outline">
                                  {neg.proposedPercentage}%
                                </Badge>
                                <span className="text-muted-foreground">
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
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No negotiation entries.
                          </p>
                        )}
                      </div>

                      <Separator />

                      {/* Salary history */}
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                          <DollarSign className="size-4" />
                          Salary History
                        </h4>
                        {empSalaryHistory.length > 0 ? (
                          <div className="space-y-1">
                            {empSalaryHistory
                              .sort(
                                (a, b) =>
                                  new Date(b.effectiveDate).getTime() -
                                  new Date(a.effectiveDate).getTime(),
                              )
                              .map((sh) => (
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

                      {/* Story 11.3 — Approve / Reject buttons */}
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
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Approve / Reject Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction === 'approve'
                ? 'Approve Request'
                : 'Reject Request'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === 'approve'
                ? 'This will advance the request to HR review. Please provide a comment.'
                : 'This will reject the request. Please provide a reason.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="finance-comment">
              Comment <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="finance-comment"
              placeholder={
                dialogAction === 'approve'
                  ? 'e.g. Within budget allocation. Approved.'
                  : 'e.g. Exceeds budget for this quarter.'
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

export default FinanceApprovalPage;
