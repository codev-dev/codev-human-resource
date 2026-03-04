// ============================================================================
// Progress Stepper Component (Epic 20)
// ============================================================================
//
// Reusable stepper for salary increase requests. Supports two modes:
//   - "mini"  : inline colored dots for table rows
//   - "full"  : expanded vertical stepper with timestamps and owner info
// ============================================================================

import { cn } from '@/lib/utils';
import { Check, Clock, Lock, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { StageEntry, IncreaseStage } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGE_ORDER: IncreaseStage[] = [
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

// ---------------------------------------------------------------------------
// Shared props
// ---------------------------------------------------------------------------

interface ProgressStepperProps {
  stageHistory: StageEntry[];
  currentStage: IncreaseStage;
  requestId?: string; // for linking in full mode
  variant?: 'mini' | 'full';
  className?: string;
}

// ---------------------------------------------------------------------------
// Mini variant — compact dots for table rows
// ---------------------------------------------------------------------------

function MiniStepper({ stageHistory, className }: ProgressStepperProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {STAGE_ORDER.map((stage) => {
        const entry = stageHistory.find((s) => s.stage === stage);
        const status = entry?.status ?? 'pending';

        let dotClass = 'bg-muted-foreground/30'; // pending / default
        let title = `${STAGE_LABELS[stage]}: Pending`;

        if (status === 'completed') {
          dotClass = 'bg-emerald-500';
          title = `${STAGE_LABELS[stage]}: Completed`;
        } else if (status === 'active') {
          dotClass = 'bg-blue-500 animate-pulse';
          title = `${STAGE_LABELS[stage]}: Active`;
        } else if (status === 'blocked') {
          dotClass = 'bg-amber-500';
          title = `${STAGE_LABELS[stage]}: Blocked`;
        }

        return (
          <span
            key={stage}
            title={title}
            className={cn('inline-block size-2.5 rounded-full shrink-0', dotClass)}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full variant — vertical stepper with details
// ---------------------------------------------------------------------------

function FullStepper({ stageHistory, requestId, className }: ProgressStepperProps) {
  return (
    <div className={cn('relative space-y-0', className)}>
      {STAGE_ORDER.map((stage, index) => {
        const entry = stageHistory.find((s) => s.stage === stage);
        const status = entry?.status ?? 'pending';
        const isLast = index === STAGE_ORDER.length - 1;

        // Icon and color logic
        let iconBg = 'bg-muted text-muted-foreground';
        let icon = <Clock className="size-4" />;
        let lineColor = 'bg-muted-foreground/20';

        if (status === 'completed') {
          iconBg = 'bg-emerald-500 text-white';
          icon = <Check className="size-4" />;
          lineColor = 'bg-emerald-500';
        } else if (status === 'active') {
          iconBg = 'bg-blue-500 text-white ring-4 ring-blue-500/20';
          icon = <Clock className="size-4" />;
          lineColor = 'bg-muted-foreground/20';
        } else if (status === 'blocked') {
          iconBg = 'bg-amber-500 text-white';
          icon = <AlertTriangle className="size-4" />;
          lineColor = 'bg-muted-foreground/20';
        }

        // Build link for full mode
        const stageLink = requestId ? `/increase-requests/${requestId}` : undefined;

        return (
          <div key={stage} className="relative flex gap-4">
            {/* Vertical connector line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[15px] top-8 w-0.5 bottom-0',
                  lineColor,
                )}
              />
            )}

            {/* Icon circle */}
            <div
              className={cn(
                'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full',
                iconBg,
              )}
            >
              {status === 'completed' && entry?.completedDate ? icon : icon}
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="flex flex-wrap items-center gap-2">
                {stageLink ? (
                  <Link
                    to={stageLink}
                    className="font-medium text-sm hover:underline"
                  >
                    {STAGE_LABELS[stage]}
                  </Link>
                ) : (
                  <span className="font-medium text-sm">{STAGE_LABELS[stage]}</span>
                )}

                {status === 'active' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                    In Progress
                  </span>
                )}
                {status === 'blocked' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <Lock className="size-3" />
                    Blocked
                  </span>
                )}
              </div>

              {/* Owner */}
              {entry?.ownerName && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Owner: {entry.ownerName}
                </p>
              )}

              {/* Timestamps */}
              {entry?.enteredDate && entry.enteredDate !== '' && (
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Started: {new Date(entry.enteredDate).toLocaleDateString()}</span>
                  {entry.completedDate && (
                    <span>Completed: {new Date(entry.completedDate).toLocaleDateString()}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function ProgressStepper(props: ProgressStepperProps) {
  const { variant = 'full' } = props;

  if (variant === 'mini') {
    return <MiniStepper {...props} />;
  }

  return <FullStepper {...props} />;
}

export { STAGE_ORDER, STAGE_LABELS };
export default ProgressStepper;
