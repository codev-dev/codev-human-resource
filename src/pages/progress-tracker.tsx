// ============================================================================
// Progress Tracker Page (Epic 20)
// ============================================================================
//
// Story 20.1-20.5: Full stepper with stages, timestamps, owner names, links
// Story 20.6: Bulk employee list with inline mini progress bar
// Story 20.7: Filters by stage, department, supervisor
// Story 20.8: Each stage in expanded stepper links to request detail
// ============================================================================

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { storage } from '@/lib/storage';
import { ReadOnlyBanner } from '@/components/auth/read-only-banner';
import {
  ProgressStepper,
  STAGE_LABELS,
} from '@/components/increase/progress-stepper';
import type { IncreaseStage } from '@/types';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Filter,
  Users,
  Inbox,
} from 'lucide-react';

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ProgressTrackerPage() {
  // ---- Data ----
  const requests = useMemo(() => storage.getIncreaseRequests(), []);
  const employees = useMemo(() => storage.getEmployees(), []);
  const users = useMemo(() => storage.getUsers(), []);

  // ---- Filters (Story 20.7) ----
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [supervisorFilter, setSupervisorFilter] = useState<string>('all');

  // ---- Expanded row ----
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ---- Derived filter options ----
  const departments = useMemo(() => {
    const depts = new Set(employees.map((e) => e.department));
    return Array.from(depts).sort();
  }, [employees]);

  const supervisors = useMemo(() => {
    const supIds = new Set(employees.map((e) => e.supervisorId));
    return Array.from(supIds)
      .map((id) => {
        const user = users.find((u) => u.id === id);
        return { id, name: user?.name ?? id };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, users]);

  // ---- Helpers ----
  const getEmployee = (empId: string) => employees.find((e) => e.id === empId);
  const getUserName = (userId: string) =>
    users.find((u) => u.id === userId)?.name ?? userId;

  // ---- Apply filters ----
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Stage filter
      if (stageFilter !== 'all' && req.currentStage !== stageFilter) return false;

      // Department filter
      const emp = getEmployee(req.employeeId);
      if (deptFilter !== 'all' && emp?.department !== deptFilter) return false;

      // Supervisor filter
      if (supervisorFilter !== 'all' && emp?.supervisorId !== supervisorFilter)
        return false;

      return true;
    });
  }, [requests, stageFilter, deptFilter, supervisorFilter, employees]);

  // ---- Render ----
  return (
    <div className="space-y-6">
      <ReadOnlyBanner />

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <BarChart3 className="size-6 text-primary" />
          Progress Tracker
        </h1>
        <p className="text-muted-foreground mt-1">
          Track the progress of salary increase requests through all stages.
        </p>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          <Users className="size-3 mr-1" />
          {filteredRequests.length} Request{filteredRequests.length !== 1 ? 's' : ''}
        </Badge>
        {stageFilter !== 'all' && (
          <Badge variant="outline">
            Stage: {STAGE_LABELS[stageFilter as IncreaseStage]}
          </Badge>
        )}
        {deptFilter !== 'all' && (
          <Badge variant="outline">Dept: {deptFilter}</Badge>
        )}
        {supervisorFilter !== 'all' && (
          <Badge variant="outline">
            Supervisor:{' '}
            {supervisors.find((s) => s.id === supervisorFilter)?.name ?? supervisorFilter}
          </Badge>
        )}
      </div>

      {/* Story 20.7 — Filters */}
      <Card size="sm">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="size-4" />
              Filters
            </div>

            {/* Stage filter */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Stage</label>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {ALL_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department filter */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Department</label>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
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

            {/* Supervisor filter */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Supervisor</label>
              <Select
                value={supervisorFilter}
                onValueChange={setSupervisorFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Supervisors</SelectItem>
                  {supervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Story 20.6 — Bulk employee list */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Inbox className="mx-auto size-12 text-muted-foreground/40" />
            <p className="mt-3 text-lg font-medium">No requests found</p>
            <p className="text-sm text-muted-foreground">
              Adjust your filters or check back later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Table header */}
            <div className="hidden lg:grid lg:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_2fr_auto] gap-3 border-b px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Employee</span>
              <span>Department</span>
              <span>Request ID</span>
              <span>Supervisor</span>
              <span>Progress</span>
              <span></span>
            </div>

            {filteredRequests.map((req) => {
              const emp = getEmployee(req.employeeId);
              const isExpanded = expandedId === req.id;
              const supervisorName = emp?.supervisorId
                ? getUserName(emp.supervisorId)
                : 'N/A';

              return (
                <div key={req.id} className="border-b last:border-b-0">
                  {/* Story 20.6 — Row with mini progress bar */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : req.id)
                    }
                    className="w-full text-left grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_2fr_auto] gap-3 px-4 py-3 hover:bg-muted/50 transition-colors items-center"
                  >
                    <span className="font-medium text-sm">
                      <span className="lg:hidden text-xs text-muted-foreground mr-1">
                        Employee:
                      </span>
                      {emp
                        ? `${emp.firstName} ${emp.lastName}`
                        : req.employeeId}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      <span className="lg:hidden text-xs mr-1">Dept:</span>
                      {emp?.department ?? 'N/A'}
                    </span>
                    <span className="font-mono text-sm">
                      <span className="lg:hidden text-xs text-muted-foreground mr-1">
                        ID:
                      </span>
                      {req.requestId}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      <span className="lg:hidden text-xs mr-1">
                        Supervisor:
                      </span>
                      {supervisorName}
                    </span>
                    <div className="flex items-center gap-2">
                      <ProgressStepper
                        stageHistory={req.stageHistory}
                        currentStage={req.currentStage}
                        variant="mini"
                      />
                      <Badge
                        variant="outline"
                        className="text-xs shrink-0"
                      >
                        {STAGE_LABELS[req.currentStage]}
                      </Badge>
                    </div>
                    <span className="flex justify-end">
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </span>
                  </button>

                  {/* Story 20.1-20.5, 20.8 — Expanded stepper */}
                  {isExpanded && (
                    <div className="border-t bg-muted/20 px-4 py-6 sm:px-8">
                      <div className="flex flex-wrap items-center justify-between mb-4">
                        <h4 className="text-sm font-medium">
                          Full Progress for {req.requestId}
                        </h4>
                        <Link
                          to={`/increase-requests/${req.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          View Full Request
                        </Link>
                      </div>

                      <ProgressStepper
                        stageHistory={req.stageHistory}
                        currentStage={req.currentStage}
                        requestId={req.id}
                        variant="full"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ProgressTrackerPage;
