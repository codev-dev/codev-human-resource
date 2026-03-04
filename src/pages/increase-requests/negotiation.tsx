// ============================================================================
// CSM Negotiation Page (Epic 10)
// ============================================================================
//
// Stories 10.1-10.4: Negotiation entry form, chronological history list,
// agreed percentage card, and lock controls.
// ============================================================================

import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { storage } from '@/lib/storage';
import { useAuthStore } from '@/stores/auth-store';
import type { NegotiationEntry, IncreaseRequest } from '@/types';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import {
  MessageSquare,
  ArrowLeft,
  Plus,
  Lock,
  CheckCircle2,
  Calendar,
  Percent,
  User,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function NegotiationPage() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.currentUser);

  // ---- Local state ----
  const [request, setRequest] = useState<IncreaseRequest | undefined>(() =>
    id ? storage.getIncreaseRequest(id) : undefined,
  );
  const [proposedPercentage, setProposedPercentage] = useState('');
  const [notes, setNotes] = useState('');
  const [closePercentage, setClosePercentage] = useState('');

  // ---- Derived data ----
  const employee = useMemo(
    () => (request ? storage.getEmployee(request.employeeId) : undefined),
    [request],
  );
  const users = useMemo(() => storage.getUsers(), []);

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.name ?? userId;
  };

  // ---- Not found ----
  if (!request || !id) {
    return (
      <div className="space-y-4">
        <Link
          to="/increase-requests"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Requests
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Increase request not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLocked = request.negotiationLocked;

  // ---- Handlers ----
  const handleAddEntry = () => {
    const pct = parseFloat(proposedPercentage);
    if (isNaN(pct) || pct <= 0 || !notes.trim()) return;

    const newEntry: NegotiationEntry = {
      id: `neg-${Date.now()}`,
      proposedPercentage: pct,
      date: new Date().toISOString().split('T')[0],
      notes: notes.trim(),
      addedBy: currentUser?.id ?? 'unknown',
    };

    const updatedNegotiations = [...request.negotiations, newEntry];
    const updated = storage.updateIncreaseRequest(id, {
      negotiations: updatedNegotiations,
      updatedAt: new Date().toISOString(),
    });

    if (updated) setRequest(updated);
    setProposedPercentage('');
    setNotes('');
  };

  const handleCloseNegotiation = () => {
    const pct = parseFloat(closePercentage);
    if (isNaN(pct) || pct <= 0) return;

    const now = new Date().toISOString().split('T')[0];

    // Update stage history
    const updatedHistory = request.stageHistory.map((entry) => {
      if (entry.stage === 'csm_negotiation') {
        return { ...entry, status: 'completed' as const, completedDate: now };
      }
      if (entry.stage === 'finance_approval') {
        return {
          ...entry,
          status: 'active' as const,
          enteredDate: now,
        };
      }
      return entry;
    });

    const updated = storage.updateIncreaseRequest(id, {
      agreedPercentage: pct,
      negotiationLocked: true,
      currentStage: 'finance_approval',
      stageHistory: updatedHistory,
      updatedAt: new Date().toISOString(),
    });

    if (updated) setRequest(updated);
    setClosePercentage('');
  };

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to={`/increase-requests/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Request Detail
      </Link>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <MessageSquare className="size-6 text-primary" />
          CSM Negotiation
        </h1>
        <p className="text-muted-foreground mt-1">
          Request {request.requestId}
          {isLocked && (
            <Badge variant="secondary" className="ml-2">
              <Lock className="size-3 mr-1" />
              Locked
            </Badge>
          )}
        </p>
      </div>

      {/* Employee and request summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Request Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Employee</p>
              <p className="font-medium">
                {employee
                  ? `${employee.firstName} ${employee.lastName}`
                  : request.employeeId}
              </p>
              {employee && (
                <p className="text-xs text-muted-foreground">{employee.position}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Department</p>
              <p className="font-medium">{employee?.department ?? 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Salary</p>
              <p className="font-medium">
                ${request.currentSalary.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Proposed Increase</p>
              <p className="font-medium">{request.increasePercentage}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Story 10.3 — Agreed percentage card */}
      {request.agreedPercentage != null && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Negotiation Closed
              </p>
              <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                {request.agreedPercentage}% Agreed
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                New salary: $
                {Math.round(
                  request.currentSalary * (1 + request.agreedPercentage / 100),
                ).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Story 10.1 — Add negotiation entry form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-4" />
              Add Negotiation Entry
            </CardTitle>
            <CardDescription>
              {isLocked
                ? 'Negotiation is locked. No new entries can be added.'
                : 'Propose a new percentage and add notes for this round.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Story 10.4 — Lock indicator */}
            {isLocked && (
              <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <Lock className="size-4 shrink-0" />
                <span>This negotiation has been closed and locked.</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="proposed-pct">Proposed Percentage (%)</Label>
              <Input
                id="proposed-pct"
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g. 10"
                value={proposedPercentage}
                onChange={(e) => setProposedPercentage(e.target.value)}
                disabled={isLocked}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="neg-notes">Notes</Label>
              <Textarea
                id="neg-notes"
                placeholder="Add context for this negotiation round..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isLocked}
                rows={3}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button
              onClick={handleAddEntry}
              disabled={
                isLocked ||
                !proposedPercentage ||
                !notes.trim() ||
                isNaN(parseFloat(proposedPercentage))
              }
            >
              <Plus className="size-4 mr-1" />
              Add Entry
            </Button>

            {!isLocked && request.negotiations.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <CheckCircle2 className="size-4 mr-1" />
                    Close Negotiation
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close Negotiation</AlertDialogTitle>
                    <AlertDialogDescription>
                      Set the agreed percentage and advance the request to finance
                      approval. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2 px-0">
                    <Label htmlFor="close-pct">Agreed Percentage (%)</Label>
                    <Input
                      id="close-pct"
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="e.g. 10"
                      value={closePercentage}
                      onChange={(e) => setClosePercentage(e.target.value)}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCloseNegotiation}
                      disabled={
                        !closePercentage || isNaN(parseFloat(closePercentage))
                      }
                    >
                      Confirm and Lock
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardFooter>
        </Card>

        {/* Story 10.2 — Chronological list of negotiation entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-4" />
              Negotiation History
            </CardTitle>
            <CardDescription>
              {request.negotiations.length} entr
              {request.negotiations.length === 1 ? 'y' : 'ies'} recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {request.negotiations.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center">
                <MessageSquare className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No negotiation entries yet. Add the first proposal above.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...request.negotiations]
                  .sort(
                    (a, b) =>
                      new Date(a.date).getTime() - new Date(b.date).getTime(),
                  )
                  .map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="relative rounded-lg border bg-card p-4"
                    >
                      {/* Round number */}
                      <div className="absolute -top-2.5 left-3">
                        <Badge variant="secondary" className="text-xs">
                          Round {idx + 1}
                        </Badge>
                      </div>

                      <div className="mt-1 space-y-2">
                        {/* Percentage and meta */}
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="inline-flex items-center gap-1 text-lg font-bold">
                            <Percent className="size-4 text-primary" />
                            {entry.proposedPercentage}%
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="size-3" />
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="size-3" />
                            {getUserName(entry.addedBy)}
                          </span>
                        </div>

                        {/* Notes */}
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {entry.notes}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default NegotiationPage;
