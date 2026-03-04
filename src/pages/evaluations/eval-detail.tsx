// ============================================================================
// Eval Detail Page (Epic 5 + Epic 6)
// ============================================================================
//
// Comprehensive evaluation detail/view page with:
// - Score summary and visual gauge
// - Answers grouped by category
// - Status tracker stepper
// - HR approval/rejection workflow
// - Notification on approval/rejection
// - PDF export for completed/approved evaluations
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { ReadOnlyBanner } from '@/components/auth/read-only-banner';
import { EvalStatusTracker } from '@/components/evaluations/eval-status-tracker';
import { PdfExportButton } from '@/components/evaluations/pdf-export';
import { storage } from '@/lib/storage';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import type {
  Evaluation,
  Employee,
  EvalTemplate,
  EvalQuestion,
  EvalAnswer,
  EvalStatus,
  User,
} from '@/types';
import {
  FileText,
  ArrowLeft,
  Star,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Info,
  Calendar,
  User as UserIcon,
  Briefcase,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatEvalType(type: string): string {
  return type === 'regularization' ? 'Regularization' : 'Annual';
}

function getRatingLabel(percentage: number): string {
  if (percentage >= 90) return 'Excellent';
  if (percentage >= 75) return 'Good';
  if (percentage >= 60) return 'Needs Improvement';
  return 'Poor';
}

function getRatingColor(percentage: number): string {
  if (percentage >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (percentage >= 75) return 'text-blue-600 dark:text-blue-400';
  if (percentage >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getRatingBg(percentage: number): string {
  if (percentage >= 90) return 'bg-emerald-500';
  if (percentage >= 75) return 'bg-blue-500';
  if (percentage >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function getStatusBadge(status: EvalStatus) {
  const map: Record<EvalStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    due: { label: 'Due', variant: 'outline' },
    in_progress: { label: 'In Progress', variant: 'secondary' },
    completed: { label: 'Completed', variant: 'default' },
    overdue: { label: 'Overdue', variant: 'destructive' },
    submitted: { label: 'Submitted', variant: 'secondary' },
    hr_review: { label: 'HR Review', variant: 'default' },
    approved: { label: 'Approved', variant: 'default' },
    rejected: { label: 'Rejected', variant: 'destructive' },
  };
  const cfg = map[status] ?? { label: status, variant: 'outline' as const };
  return (
    <Badge
      variant={cfg.variant}
      className={
        status === 'approved'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
          : status === 'hr_review'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
            : status === 'submitted'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400'
              : undefined
      }
    >
      {cfg.label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Story 5.1 — Submission confirmation banner */
function SubmissionBanner() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-800 dark:bg-indigo-950/40">
      <Info className="mt-0.5 size-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
      <div>
        <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
          This evaluation has been submitted for review
        </p>
        <p className="mt-1 text-xs text-indigo-600/80 dark:text-indigo-400/70">
          An HR administrator will review and approve or return this evaluation. You will be notified once a decision is made.
        </p>
      </div>
    </div>
  );
}

/** Rejection banner */
function RejectionBanner({ reason }: { reason?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/40">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
      <div>
        <p className="text-sm font-medium text-red-800 dark:text-red-300">
          This evaluation was rejected
        </p>
        {reason && (
          <p className="mt-1 text-sm text-red-700/80 dark:text-red-400/70">
            Reason: {reason}
          </p>
        )}
      </div>
    </div>
  );
}

/** Approval success banner */
function ApprovalBanner() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/40">
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <div>
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
          This evaluation has been approved
        </p>
      </div>
    </div>
  );
}

/** Score Summary Card */
function ScoreSummaryCard({
  totalScore,
  maxScore,
}: {
  totalScore: number;
  maxScore: number;
}) {
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const label = getRatingLabel(percentage);
  const colorClass = getRatingColor(percentage);
  const bgClass = getRatingBg(percentage);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="size-5 text-amber-500" />
          Score Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
          {/* Circular gauge */}
          <div className="relative flex size-32 shrink-0 items-center justify-center">
            <svg className="size-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                strokeWidth="10"
                className="stroke-muted"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - percentage / 100)}`}
                className={
                  percentage >= 90
                    ? 'stroke-emerald-500'
                    : percentage >= 75
                      ? 'stroke-blue-500'
                      : percentage >= 60
                        ? 'stroke-amber-500'
                        : 'stroke-red-500'
                }
                style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={`text-2xl font-bold ${colorClass}`}>{percentage}%</span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div>
              <p className={`text-xl font-semibold ${colorClass}`}>{label}</p>
              <p className="text-sm text-muted-foreground">
                {totalScore.toFixed(1)} out of {maxScore} points
              </p>
            </div>

            {/* Linear bar */}
            <div className="w-full max-w-xs">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${bgClass}`}
                  style={{
                    width: `${percentage}%`,
                    transition: 'width 0.8s ease-in-out',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Category score summary (Story 5.1) */
function CategoryScoreSummary({
  template,
  answers,
}: {
  template: EvalTemplate;
  answers: EvalAnswer[];
}) {
  const categories = [...new Set(template.questions.map((q) => q.category))];

  const catScores = categories.map((cat) => {
    const questions = template.questions.filter((q) => q.category === cat);
    const totalWeight = questions.reduce((s, q) => s + q.weight, 0);
    const earned = questions.reduce((s, q) => {
      const ans = answers.find((a) => a.questionId === q.id);
      return s + (ans?.score ?? 0);
    }, 0);
    const pct = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;
    return { category: cat, earned, totalWeight, pct };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scores by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {catScores.map((cs) => (
            <div key={cs.category}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{cs.category}</span>
                <span className="text-muted-foreground">
                  {cs.earned.toFixed(1)} / {cs.totalWeight} ({cs.pct}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${getRatingBg(cs.pct)}`}
                  style={{ width: `${cs.pct}%`, transition: 'width 0.5s ease' }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Star display for rating values */
function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`size-4 ${
            i < value
              ? 'fill-amber-400 text-amber-400'
              : 'fill-muted text-muted'
          }`}
        />
      ))}
      <span className="ml-1.5 text-sm text-muted-foreground">
        {value}/{max}
      </span>
    </div>
  );
}

/** Single answer display */
function AnswerDisplay({
  question,
  answer,
}: {
  question: EvalQuestion;
  answer?: EvalAnswer;
}) {
  if (!answer) {
    return <span className="text-sm italic text-muted-foreground">Not answered</span>;
  }

  switch (question.type) {
    case 'rating':
      return <StarRating value={Number(answer.value)} max={question.maxRating ?? 5} />;

    case 'yes_no':
      return answer.value ? (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
          <CheckCircle2 className="mr-1 size-3" />
          Yes
        </Badge>
      ) : (
        <Badge variant="destructive">
          <XCircle className="mr-1 size-3" />
          No
        </Badge>
      );

    case 'dropdown':
      return (
        <Badge variant="secondary">{String(answer.value)}</Badge>
      );

    case 'text':
      return (
        <p className="max-w-prose text-sm text-foreground">{String(answer.value)}</p>
      );

    default:
      return <span className="text-sm">{String(answer.value)}</span>;
  }
}

/** Answers section grouped by category */
function AnswersSection({
  template,
  answers,
}: {
  template: EvalTemplate;
  answers: EvalAnswer[];
}) {
  const categories = [...new Set(template.questions.map((q) => q.category))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5 text-primary" />
          Evaluation Answers
        </CardTitle>
        <CardDescription>
          {template.questions.length} questions across {categories.length} categories
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {categories.map((category, catIdx) => {
          const catQuestions = template.questions.filter((q) => q.category === category);
          return (
            <div key={category}>
              {catIdx > 0 && <Separator className="mb-6" />}
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {category}
              </h3>
              <div className="space-y-4">
                {catQuestions.map((question) => {
                  const answer = answers.find((a) => a.questionId === question.id);
                  return (
                    <div
                      key={question.id}
                      className="rounded-lg border border-border/50 p-4"
                    >
                      <div className="mb-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <p className="text-sm font-medium leading-snug">{question.text}</p>
                        {answer && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            Score: {answer.score.toFixed(1)} / {question.weight}
                          </span>
                        )}
                      </div>
                      <AnswerDisplay question={question} answer={answer} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/** Story 5.4 — Rejection reason modal */
function RejectModal({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function handleConfirm() {
    if (!reason.trim()) {
      setError('Please provide a reason for rejection.');
      return;
    }
    onConfirm(reason.trim());
    setReason('');
    setError('');
  }

  function handleCancel() {
    onOpenChange(false);
    setReason('');
    setError('');
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Evaluation</AlertDialogTitle>
          <AlertDialogDescription>
            Please provide a reason for rejecting this evaluation. The evaluator will be notified and can revise their submission.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rejection-reason">Rejection Reason *</Label>
          <Textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder="Explain why this evaluation is being returned for revision..."
            className="min-h-24"
            aria-invalid={!!error}
          />
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm}>
            Reject Evaluation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export function EvalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.currentUser);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [actionTaken, setActionTaken] = useState<'approved' | 'rejected' | null>(null);

  // Load data
  const evaluation = useMemo(() => (id ? storage.getEvaluation(id) : undefined), [id, actionTaken]);
  const employee = useMemo(
    () => (evaluation ? storage.getEmployee(evaluation.employeeId) : undefined),
    [evaluation],
  );
  const template = useMemo(
    () => (evaluation ? storage.getEvalTemplate(evaluation.templateId) : undefined),
    [evaluation],
  );
  const evaluator = useMemo(
    () => (evaluation ? storage.getUser(evaluation.evaluatorId) : undefined),
    [evaluation],
  );
  const reviewer = useMemo(
    () => (evaluation?.reviewerId ? storage.getUser(evaluation.reviewerId) : undefined),
    [evaluation],
  );

  // ---- Derived state ----
  const isAdmin = currentUser?.role === 'admin';
  const canReview =
    isAdmin &&
    evaluation &&
    (evaluation.status === 'submitted' || evaluation.status === 'hr_review');
  const showStatusTracker =
    evaluation &&
    ['submitted', 'hr_review', 'approved', 'rejected'].includes(evaluation.status);
  const percentage =
    evaluation && evaluation.maxScore > 0
      ? Math.round((evaluation.totalScore / evaluation.maxScore) * 100)
      : 0;

  // ---- Actions ----

  /** Story 5.3 — Approve evaluation */
  const handleApprove = useCallback(() => {
    if (!evaluation || !currentUser) return;

    const now = new Date().toISOString();
    storage.updateEvaluation(evaluation.id, {
      status: 'approved' as EvalStatus,
      reviewerId: currentUser.id,
      reviewedDate: now,
      updatedAt: now,
    });

    // Story 5.5 — notify evaluator
    addNotification({
      id: `notif-${Date.now()}`,
      userId: evaluation.evaluatorId,
      title: 'Evaluation Approved',
      message: `The evaluation for ${employee?.firstName} ${employee?.lastName} has been approved.`,
      type: 'success',
      read: false,
      link: `/evaluations/${evaluation.id}`,
      createdAt: now,
    });

    setActionTaken('approved');
  }, [evaluation, currentUser, employee, addNotification]);

  /** Story 5.3 + 5.4 — Reject evaluation */
  const handleReject = useCallback(
    (reason: string) => {
      if (!evaluation || !currentUser) return;

      const now = new Date().toISOString();
      storage.updateEvaluation(evaluation.id, {
        status: 'rejected' as EvalStatus,
        reviewerId: currentUser.id,
        reviewedDate: now,
        rejectionReason: reason,
        updatedAt: now,
      });

      // Story 5.5 — notify evaluator
      addNotification({
        id: `notif-${Date.now()}`,
        userId: evaluation.evaluatorId,
        title: 'Evaluation Rejected',
        message: `The evaluation for ${employee?.firstName} ${employee?.lastName} has been rejected. Reason: ${reason}`,
        type: 'error',
        read: false,
        link: `/evaluations/${evaluation.id}`,
        createdAt: now,
      });

      setRejectModalOpen(false);
      setActionTaken('rejected');
    },
    [evaluation, currentUser, employee, addNotification],
  );

  // ---- Error states ----

  if (!evaluation) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 size-12 text-muted-foreground/40" />
            <h2 className="text-lg font-medium">Evaluation Not Found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The evaluation you are looking for does not exist or has been removed.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/evaluations">
                <ArrowLeft className="size-4" data-icon="inline-start" />
                Back to Evaluations
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!template || !employee) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto mb-4 size-12 text-amber-500/60" />
            <h2 className="text-lg font-medium">Data Incomplete</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The employee or evaluation template associated with this record could not be loaded.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Effective status (after action) ----
  const effectiveStatus = actionTaken ?? evaluation.status;

  return (
    <div className="space-y-6">
      <ReadOnlyBanner />

      {/* Back link + Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link
            to="/evaluations"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to Evaluations
          </Link>
          <h1 className="text-xl font-semibold">{template.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <UserIcon className="size-3.5" />
              {employee.firstName} {employee.lastName}
            </span>
            <span className="text-border">|</span>
            <span className="inline-flex items-center gap-1">
              <Briefcase className="size-3.5" />
              {employee.department} &mdash; {employee.position}
            </span>
            <span className="text-border">|</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" />
              Due {formatDate(evaluation.dueDate)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {getStatusBadge(effectiveStatus as EvalStatus)}
          <Badge variant="outline">{formatEvalType(evaluation.type)}</Badge>
          <PdfExportButton
            evaluation={{ ...evaluation, status: effectiveStatus as EvalStatus }}
            employee={employee}
            template={template}
            evaluator={evaluator}
            reviewer={reviewer ?? (actionTaken ? currentUser ?? undefined : undefined)}
          />
        </div>
      </div>

      {/* Banners */}
      {effectiveStatus === 'submitted' && <SubmissionBanner />}
      {effectiveStatus === 'rejected' && <RejectionBanner reason={evaluation.rejectionReason} />}
      {effectiveStatus === 'approved' && actionTaken === 'approved' && <ApprovalBanner />}

      {/* Story 5.2 — Status Tracker */}
      {showStatusTracker && (
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <EvalStatusTracker
              currentStatus={effectiveStatus as EvalStatus}
              submittedDate={evaluation.submittedDate}
              reviewedDate={evaluation.reviewedDate ?? (actionTaken ? new Date().toISOString() : undefined)}
            />
          </CardContent>
        </Card>
      )}

      {/* Story 5.3 — HR Approval Actions */}
      {canReview && !actionTaken && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="size-5 text-primary" />
              HR Review Actions
            </CardTitle>
            <CardDescription>
              Review the evaluation details below and approve or reject this submission.
            </CardDescription>
            <CardAction>
              <div className="flex gap-2">
                <Button
                  onClick={handleApprove}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <ThumbsUp className="size-4" data-icon="inline-start" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setRejectModalOpen(true)}
                >
                  <ThumbsDown className="size-4" data-icon="inline-start" />
                  Reject
                </Button>
              </div>
            </CardAction>
          </CardHeader>
        </Card>
      )}

      {/* Score Summary */}
      {evaluation.answers.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ScoreSummaryCard
            totalScore={evaluation.totalScore}
            maxScore={evaluation.maxScore}
          />
          <CategoryScoreSummary template={template} answers={evaluation.answers} />
        </div>
      )}

      {/* Evaluation Info */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Employee ID</p>
              <p className="text-sm font-medium">{employee.employeeId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Evaluator</p>
              <p className="text-sm font-medium">{evaluator?.name ?? 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reviewer</p>
              <p className="text-sm font-medium">
                {actionTaken
                  ? currentUser?.name ?? 'N/A'
                  : reviewer?.name ?? 'Pending'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hire Date</p>
              <p className="text-sm font-medium">{formatDate(employee.hireDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Started</p>
              <p className="text-sm font-medium">{formatDate(evaluation.startedDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="text-sm font-medium">{formatDate(evaluation.submittedDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reviewed</p>
              <p className="text-sm font-medium">
                {actionTaken
                  ? formatDate(new Date().toISOString())
                  : formatDate(evaluation.reviewedDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Score</p>
              <p className={`text-sm font-semibold ${getRatingColor(percentage)}`}>
                {evaluation.answers.length > 0
                  ? `${percentage}% (${getRatingLabel(percentage)})`
                  : 'Not yet scored'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Answers */}
      {evaluation.answers.length > 0 && (
        <AnswersSection template={template} answers={evaluation.answers} />
      )}

      {/* Rejection reason display */}
      {evaluation.rejectionReason && effectiveStatus === 'rejected' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="size-5" />
              Rejection Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{evaluation.rejectionReason}</p>
            {reviewer && (
              <p className="mt-3 text-xs text-muted-foreground">
                Rejected by {reviewer.name} on {formatDate(evaluation.reviewedDate)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rejection Modal (Story 5.4) */}
      <RejectModal
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        onConfirm={handleReject}
      />
    </div>
  );
}

export default EvalDetailPage;
