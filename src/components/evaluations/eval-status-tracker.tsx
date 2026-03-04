// ============================================================================
// Eval Status Tracker (Story 5.2)
// ============================================================================
//
// Visual stepper showing evaluation status progression:
// Submitted -> HR Review -> Approved/Rejected
// ============================================================================

import { Check, X, Clock, Send, UserCheck, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EvalStatus } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EvalStatusTrackerProps {
  currentStatus: EvalStatus;
  submittedDate?: string;
  reviewedDate?: string;
  className?: string;
}

interface StepConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  state: 'completed' | 'active' | 'pending' | 'rejected';
  date?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getSteps(
  status: EvalStatus,
  submittedDate?: string,
  reviewedDate?: string,
): StepConfig[] {
  const isRejected = status === 'rejected';
  const isApproved = status === 'approved';
  const isHrReview = status === 'hr_review';
  const isSubmitted = status === 'submitted';

  const steps: StepConfig[] = [
    {
      label: 'Submitted',
      icon: Send,
      state:
        isSubmitted || isHrReview || isApproved || isRejected
          ? 'completed'
          : status === 'completed'
            ? 'completed'
            : 'pending',
      date: submittedDate,
    },
    {
      label: 'HR Review',
      icon: UserCheck,
      state: isHrReview
        ? 'active'
        : isApproved || isRejected
          ? 'completed'
          : 'pending',
      date: isHrReview ? undefined : isApproved || isRejected ? reviewedDate : undefined,
    },
    {
      label: isRejected ? 'Rejected' : 'Approved',
      icon: isRejected ? X : ShieldCheck,
      state: isApproved
        ? 'completed'
        : isRejected
          ? 'rejected'
          : 'pending',
      date: isApproved || isRejected ? reviewedDate : undefined,
    },
  ];

  return steps;
}

// ---------------------------------------------------------------------------
// Step Icon
// ---------------------------------------------------------------------------

function StepIcon({ step }: { step: StepConfig }) {
  const Icon = step.icon;

  if (step.state === 'completed') {
    return (
      <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-600">
        <Check className="size-5" />
      </div>
    );
  }

  if (step.state === 'active') {
    return (
      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary animate-pulse">
        <Clock className="size-5" />
      </div>
    );
  }

  if (step.state === 'rejected') {
    return (
      <div className="flex size-10 items-center justify-center rounded-full bg-red-100 text-red-600 ring-2 ring-red-500 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-600">
        <X className="size-5" />
      </div>
    );
  }

  // pending
  return (
    <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground ring-2 ring-border">
      <Icon className="size-5" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connector Line
// ---------------------------------------------------------------------------

function ConnectorLine({ state }: { state: 'completed' | 'active' | 'pending' | 'rejected' }) {
  return (
    <div
      className={cn(
        'hidden h-0.5 flex-1 sm:block',
        state === 'completed' && 'bg-emerald-500 dark:bg-emerald-600',
        state === 'active' && 'bg-gradient-to-r from-emerald-500 to-border',
        state === 'rejected' && 'bg-gradient-to-r from-emerald-500 to-red-500',
        state === 'pending' && 'bg-border',
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EvalStatusTracker({
  currentStatus,
  submittedDate,
  reviewedDate,
  className,
}: EvalStatusTrackerProps) {
  const steps = getSteps(currentStatus, submittedDate, reviewedDate);

  // Determine connector states
  function getConnectorState(fromIdx: number): StepConfig['state'] {
    const to = steps[fromIdx + 1];
    if (!to) return 'pending';
    if (to.state === 'completed') return 'completed';
    if (to.state === 'active') return 'active';
    if (to.state === 'rejected') return 'rejected';
    return 'pending';
  }

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', className)}>
      {steps.map((step, idx) => (
        <div key={step.label} className="contents">
          {/* Step */}
          <div className="flex items-center gap-3 sm:flex-col sm:gap-2 sm:text-center">
            <StepIcon step={step} />
            <div className="min-w-0">
              <p
                className={cn(
                  'text-sm font-medium',
                  step.state === 'completed' && 'text-emerald-700 dark:text-emerald-400',
                  step.state === 'active' && 'text-primary',
                  step.state === 'rejected' && 'text-red-600 dark:text-red-400',
                  step.state === 'pending' && 'text-muted-foreground',
                )}
              >
                {step.label}
              </p>
              {step.date && (
                <p className="text-xs text-muted-foreground">{formatDate(step.date)}</p>
              )}
              {step.state === 'active' && (
                <p className="text-xs text-primary/70">In Progress</p>
              )}
            </div>
          </div>

          {/* Connector */}
          {idx < steps.length - 1 && (
            <>
              {/* Mobile vertical connector */}
              <div className="ml-5 h-6 w-0.5 sm:hidden">
                <div
                  className={cn(
                    'h-full w-full',
                    getConnectorState(idx) === 'completed' && 'bg-emerald-500',
                    getConnectorState(idx) === 'active' && 'bg-gradient-to-b from-emerald-500 to-border',
                    getConnectorState(idx) === 'rejected' && 'bg-gradient-to-b from-emerald-500 to-red-500',
                    getConnectorState(idx) === 'pending' && 'bg-border',
                  )}
                />
              </div>
              {/* Desktop horizontal connector */}
              <ConnectorLine state={getConnectorState(idx)} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default EvalStatusTracker;
