// ============================================================================
// New Increase Request Page (Epics 8, 13)
// ============================================================================

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth-store';
import { storage } from '@/lib/storage';
import type { Employee, Evaluation, IncreaseRequest, SalaryHistory, StageEntry } from '@/types';
import {
  PlusCircle,
  User,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  FileText,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateRequestId(existingRequests: IncreaseRequest[]): string {
  const year = new Date().getFullYear();
  const existing = existingRequests.filter((r) => r.requestId.startsWith(`INC-${year}`));
  const nextNum = existing.length + 1;
  return `INC-${year}-${String(nextNum).padStart(3, '0')}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewIncreasePage() {
  const currentUser = useAuthStore((s) => s.currentUser);

  const employees = storage.getEmployees().filter((e) => e.status === 'active' || e.status === 'probation');
  const evaluations = storage.getEvaluations();
  const salaryHistory = storage.getSalaryHistory();
  const allRequests = storage.getIncreaseRequests();
  const users = storage.getUsers();

  // Form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>('');
  const [increasePercentage, setIncreasePercentage] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string>('');
  const [createdId, setCreatedId] = useState<string>('');

  // Selected employee info
  const selectedEmployee = useMemo<Employee | undefined>(() => {
    if (!selectedEmployeeId) return undefined;
    return employees.find((e) => e.id === selectedEmployeeId);
  }, [selectedEmployeeId, employees]);

  // Employee evaluation status (Epic 13 - Eval gating)
  const employeeEval = useMemo<{ approved: Evaluation | undefined; pending: Evaluation | undefined }>(() => {
    if (!selectedEmployeeId) return { approved: undefined, pending: undefined };
    const empEvals = evaluations.filter((ev) => ev.employeeId === selectedEmployeeId);
    const approved = empEvals.find((ev) => ev.status === 'approved');
    const pending = empEvals.find((ev) => ev.status !== 'approved' && ev.status !== 'rejected');
    return { approved, pending };
  }, [selectedEmployeeId, evaluations]);

  const hasApprovedEval = !!employeeEval.approved;

  // Last increase info (Story 8.2)
  const lastIncrease = useMemo<SalaryHistory | undefined>(() => {
    if (!selectedEmployeeId) return undefined;
    const empHistory = salaryHistory
      .filter((sh) => sh.employeeId === selectedEmployeeId)
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    return empHistory[0];
  }, [selectedEmployeeId, salaryHistory]);

  // Supervisor name
  const supervisorName = useMemo<string>(() => {
    if (!selectedEmployee) return '';
    const supervisor = users.find((u) => u.id === selectedEmployee.supervisorId);
    return supervisor?.name ?? 'Unknown';
  }, [selectedEmployee, users]);

  // Calculated proposed salary
  const proposedSalary = useMemo<number>(() => {
    if (!selectedEmployee || !increasePercentage) return 0;
    const pct = parseFloat(increasePercentage);
    if (isNaN(pct) || pct <= 0) return 0;
    return Math.round(selectedEmployee.currentSalary * (1 + pct / 100));
  }, [selectedEmployee, increasePercentage]);

  // Validation
  const canSubmit = selectedEmployeeId && effectiveDate && increasePercentage && parseFloat(increasePercentage) > 0 && hasApprovedEval;

  function handleSubmit() {
    if (!canSubmit || !selectedEmployee || !currentUser) return;

    const pct = parseFloat(increasePercentage);
    const newRequestId = generateRequestId(allRequests);
    const now = new Date().toISOString();
    const id = `inc-${Date.now()}`;

    const initialStage: StageEntry = {
      stage: 'initiated',
      status: 'completed',
      enteredDate: now,
      completedDate: now,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
    };

    const clientApprovalStage: StageEntry = {
      stage: 'client_approval',
      status: 'active',
      enteredDate: now,
    };

    const request: IncreaseRequest = {
      id,
      requestId: newRequestId,
      employeeId: selectedEmployeeId,
      requestedBy: currentUser.id,
      currentSalary: selectedEmployee.currentSalary,
      proposedSalary: Math.round(selectedEmployee.currentSalary * (1 + pct / 100)),
      increasePercentage: pct,
      effectiveDate,
      notes,
      linkedEvalId: employeeEval.approved?.id,
      currentStage: 'client_approval',
      stageHistory: [initialStage, clientApprovalStage],
      clientApprovalStatus: 'pending',
      negotiations: [],
      negotiationLocked: false,
      financeApprovalStatus: 'pending',
      hrApprovalStatus: 'pending',
      supervisorNotified: false,
      payrollSubmitted: false,
      createdAt: now,
      updatedAt: now,
    };

    storage.createIncreaseRequest(request);
    setCreatedRequestId(newRequestId);
    setCreatedId(id);
    setSubmitted(true);
  }

  // ---------------------------------------------------------------------------
  // Confirmation screen (Story 8.4)
  // ---------------------------------------------------------------------------

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
              <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Request Created Successfully</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Increase request <span className="font-medium text-foreground">{createdRequestId}</span> has been created
                and is now awaiting client approval.
              </p>
            </div>
            <Separator />
            <div className="flex gap-3">
              <Button asChild>
                <Link to={`/increase-requests/${createdId}`}>
                  <FileText className="size-4" data-icon="inline-start" />
                  View Request
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/increase-requests">
                  <ArrowLeft className="size-4" data-icon="inline-start" />
                  Back to List
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link to="/increase-requests">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <PlusCircle className="size-6 text-primary" />
            New Increase Request
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Initiate a salary increase request for an employee.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>Fill in the required information to create a new increase request.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Employee Selector */}
            <div className="space-y-2">
              <Label htmlFor="employee">Employee</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger id="employee" className="w-full">
                  <SelectValue placeholder="Select an employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId}) - {emp.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Effective Date */}
            <div className="space-y-2">
              <Label htmlFor="effectiveDate">Effective Date</Label>
              <Input
                id="effectiveDate"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>

            {/* Proposed Increase % */}
            <div className="space-y-2">
              <Label htmlFor="percentage">Proposed Increase Percentage</Label>
              <div className="relative">
                <Input
                  id="percentage"
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  placeholder="e.g., 10"
                  value={increasePercentage}
                  onChange={(e) => setIncreasePercentage(e.target.value)}
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
              {proposedSalary > 0 && selectedEmployee && (
                <p className="text-xs text-muted-foreground">
                  New salary: <span className="font-medium text-foreground">{formatCurrency(proposedSalary)}</span>
                  {' '}(increase of {formatCurrency(proposedSalary - selectedEmployee.currentSalary)})
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Justification</Label>
              <Textarea
                id="notes"
                placeholder="Provide context for this increase request..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>

            {/* Eval Gate Warning (Story 13.2, 13.3) */}
            {selectedEmployeeId && !hasApprovedEval && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                <div className="flex gap-3">
                  <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Evaluation Required
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      This employee does not have an approved evaluation. An approved evaluation is required
                      before submitting an increase request.
                    </p>
                    {employeeEval.pending && (
                      <Link
                        to={`/evaluations/${employeeEval.pending.id}`}
                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
                      >
                        <ExternalLink className="size-3.5" />
                        View pending evaluation ({employeeEval.pending.status})
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedEmployeeId && hasApprovedEval && (
              <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/40">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    Eval Gate Cleared
                  </p>
                  <span className="text-xs text-green-600 dark:text-green-400">
                    (Score: {employeeEval.approved!.totalScore}/{employeeEval.approved!.maxScore})
                  </span>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex gap-3">
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                <PlusCircle className="size-4" data-icon="inline-start" />
                Submit Request
              </Button>
              <Button variant="outline" asChild>
                <Link to="/increase-requests">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Side Panel: Employee Info (Story 8.2) */}
        <div className="space-y-4">
          {selectedEmployee ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <User className="size-4 text-primary" />
                    Employee Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Employee ID</p>
                      <p className="font-medium">{selectedEmployee.employeeId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="font-medium">{selectedEmployee.department}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Position</p>
                      <p className="font-medium">{selectedEmployee.position}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Supervisor</p>
                      <p className="font-medium">{supervisorName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Hire Date</p>
                      <p className="font-medium">{format(new Date(selectedEmployee.hireDate), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <DollarSign className="size-4 text-primary" />
                    Current Salary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-2xl font-semibold">{formatCurrency(selectedEmployee.currentSalary)}</p>
                  {lastIncrease ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Last increase:</span>
                        <span className="font-medium">{format(new Date(lastIncrease.effectiveDate), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-medium">
                          +{lastIncrease.increasePercentage.toFixed(1)}% ({formatCurrency(lastIncrease.newSalary - lastIncrease.previousSalary)})
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No previous increases on record.</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="mx-auto size-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Select an employee to view their information.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default NewIncreasePage;
