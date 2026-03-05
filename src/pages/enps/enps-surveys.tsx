import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '@/lib/storage';
import { useAuthStore } from '@/stores/auth-store';
import type { ENPSSurvey, ENPSInvite, ENPSResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, BarChart3, Send, Users, TrendingUp, Eye, XCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helper: Calculate NPS from responses
// ---------------------------------------------------------------------------

function calculateNPS(responses: ENPSResponse[]): number {
  if (responses.length === 0) return 0;
  const promoters = responses.filter((r) => r.score >= 9).length;
  const detractors = responses.filter((r) => r.score <= 6).length;
  return Math.round(((promoters - detractors) / responses.length) * 100);
}

// ---------------------------------------------------------------------------
// Helper: Format date
// ---------------------------------------------------------------------------

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ENPSSurveysPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSurveyName, setNewSurveyName] = useState('');

  // Data refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);

  // Data
  const surveys = useMemo(() => storage.getENPSSurveys(), [refreshKey]);
  const allInvites = useMemo(() => storage.getENPSInvites(), [refreshKey]);
  const allResponses = useMemo(() => storage.getENPSResponses(), [refreshKey]);

  // Pre-compute per-survey metrics
  const surveyMetrics = useMemo(() => {
    const metrics = new Map<
      string,
      { invited: number; responded: number; nps: number }
    >();

    for (const survey of surveys) {
      const invites = allInvites.filter((i) => i.surveyId === survey.id);
      const responses = allResponses.filter((r) => r.surveyId === survey.id);
      metrics.set(survey.id, {
        invited: invites.length,
        responded: responses.length,
        nps: calculateNPS(responses),
      });
    }

    return metrics;
  }, [surveys, allInvites, allResponses]);

  // Summary stats
  const stats = useMemo(() => {
    const total = surveys.length;
    const active = surveys.filter((s) => s.status === 'active').length;
    const totalResponses = allResponses.length;
    const avgNPS =
      surveys.length > 0
        ? Math.round(
            surveys.reduce((sum, s) => {
              const m = surveyMetrics.get(s.id);
              return sum + (m?.nps ?? 0);
            }, 0) / surveys.length
          )
        : 0;

    return { total, active, totalResponses, avgNPS };
  }, [surveys, allResponses, surveyMetrics]);

  // Create survey handler
  const handleCreateSurvey = useCallback(() => {
    if (!newSurveyName.trim() || !currentUser) return;

    const surveyId = `enps-survey-${Date.now()}`;
    const now = new Date().toISOString();

    // Create the survey
    const newSurvey: ENPSSurvey = {
      id: surveyId,
      name: newSurveyName.trim(),
      createdBy: currentUser.id,
      createdAt: now,
      status: 'active',
    };
    storage.createENPSSurvey(newSurvey);

    // Auto-generate invites for every active employee
    const activeEmployees = storage.getEmployees().filter((e) => e.status === 'active');

    if (activeEmployees.length === 0) {
      alert('No active employees found. Cannot create survey invites.');
      return;
    }

    for (const emp of activeEmployees) {
      const invite: ENPSInvite = {
        id: `enps-inv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        surveyId,
        employeeEmail: emp.email,
        linkId: `nps-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 8)}`,
        answered: false,
        sentAt: now,
      };
      storage.createENPSInvite(invite);
    }

    // Reset dialog
    setNewSurveyName('');
    setDialogOpen(false);
    setRefreshKey((k) => k + 1);
  }, [newSurveyName, currentUser]);

  // Close survey handler
  const handleCloseSurvey = useCallback(
    (surveyId: string) => {
      if (!confirm('Are you sure you want to close this survey? No more responses will be accepted.')) {
        return;
      }
      storage.updateENPSSurvey(surveyId, {
        status: 'closed',
        closedAt: new Date().toISOString(),
      });
      setRefreshKey((k) => k + 1);
    },
    []
  );

  // Delete survey handler
  const handleDeleteSurvey = useCallback(
    (surveyId: string) => {
      const responses = allResponses.filter((r) => r.surveyId === surveyId);
      if (responses.length > 0) return;

      if (!confirm('Are you sure you want to delete this survey? This action cannot be undone.')) {
        return;
      }

      // Remove related invites
      const invites = allInvites.filter((i) => i.surveyId === surveyId);
      for (const inv of invites) {
        storage.removeENPSInvite(inv.id);
      }

      storage.removeENPSSurvey(surveyId);
      setRefreshKey((k) => k + 1);
    },
    [allResponses, allInvites]
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <BarChart3 className="size-6 text-primary" />
            eNPS Surveys
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage Employee Net Promoter Score surveys.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Create Survey
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New eNPS Survey</DialogTitle>
              <DialogDescription>
                A unique survey link will be generated for every active employee.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="survey-name">Survey Name</Label>
                <Input
                  id="survey-name"
                  placeholder='e.g. "Q2 2026 eNPS"'
                  value={newSurveyName}
                  onChange={(e) => setNewSurveyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateSurvey();
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setNewSurveyName('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateSurvey} disabled={!newSurveyName.trim()}>
                <Send className="size-4" />
                Create & Send Invites
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Surveys</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Send className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Active Surveys</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalResponses}</p>
              <p className="text-xs text-muted-foreground">Total Responses</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <TrendingUp className="size-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.avgNPS}</p>
              <p className="text-xs text-muted-foreground">Average NPS Score</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Surveys table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            All Surveys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Name</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
                  <th className="hidden whitespace-nowrap px-4 py-3 font-medium sm:table-cell">
                    Created
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-center">Invited</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-center">Responded</th>
                  <th className="hidden whitespace-nowrap px-4 py-3 font-medium text-center md:table-cell">
                    NPS Score
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {surveys.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No surveys yet. Create your first eNPS survey to get started.
                    </td>
                  </tr>
                ) : (
                  [...surveys]
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )
                    .map((survey) => {
                      const metrics = surveyMetrics.get(survey.id);
                      const invited = metrics?.invited ?? 0;
                      const responded = metrics?.responded ?? 0;
                      const nps = metrics?.nps ?? 0;
                      const hasResponses = responded > 0;

                      return (
                        <tr
                          key={survey.id}
                          className="border-b transition-colors last:border-b-0 hover:bg-muted/30"
                        >
                          {/* Name */}
                          <td className="px-4 py-3 font-medium">{survey.name}</td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <Badge
                              className={cn(
                                survey.status === 'active'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300'
                              )}
                            >
                              {survey.status === 'active' ? 'Active' : 'Closed'}
                            </Badge>
                          </td>

                          {/* Created */}
                          <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                            {formatDate(survey.createdAt)}
                          </td>

                          {/* Invited */}
                          <td className="px-4 py-3 text-center">{invited}</td>

                          {/* Responded */}
                          <td className="px-4 py-3 text-center">{responded}</td>

                          {/* NPS Score */}
                          <td className="hidden px-4 py-3 text-center md:table-cell">
                            <span
                              className={cn(
                                'font-semibold',
                                nps > 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : nps < 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-muted-foreground'
                              )}
                            >
                              {responded > 0 ? nps : '--'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/enps/surveys/${survey.id}`)}
                              >
                                <Eye className="size-3.5" />
                                <span className="hidden sm:inline">View</span>
                              </Button>
                              {survey.status === 'active' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCloseSurvey(survey.id)}
                                >
                                  <XCircle className="size-3.5" />
                                  <span className="hidden lg:inline">Close</span>
                                </Button>
                              )}
                              {!hasResponses && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteSurvey(survey.id)}
                                >
                                  <Trash2 className="size-3.5" />
                                  <span className="hidden lg:inline">Delete</span>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ENPSSurveysPage;
