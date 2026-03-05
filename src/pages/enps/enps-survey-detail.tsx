import { useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storage } from '@/lib/storage';
import type { ENPSResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Copy,
  Send,
  Users,
  CheckCircle2,
  Clock,
  BarChart3,
  XCircle,
  Bell,
} from 'lucide-react';
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
// Helper: Build public link URL
// ---------------------------------------------------------------------------

function buildPublicLink(linkId: string): string {
  return `${window.location.origin}/public/enps/${linkId}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ENPSSurveyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Toast state
  const [toast, setToast] = useState('');

  // Data refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);

  // Data
  const survey = useMemo(
    () => (id ? storage.getENPSSurvey(id) : undefined),
    [id, refreshKey]
  );

  const invites = useMemo(
    () => (id ? storage.getENPSInvites().filter((i) => i.surveyId === id) : []),
    [id, refreshKey]
  );

  const responses = useMemo(
    () => (id ? storage.getENPSResponses().filter((r) => r.surveyId === id) : []),
    [id, refreshKey]
  );

  // Users map for createdBy lookup
  const usersMap = useMemo(() => {
    const users = storage.getUsers();
    const map = new Map<string, string>();
    users.forEach((u) => map.set(u.id, u.name));
    return map;
  }, []);

  // Stats
  const stats = useMemo(() => {
    const totalInvited = invites.length;
    const answered = invites.filter((i) => i.answered).length;
    const pending = totalInvited - answered;
    const responseRate = totalInvited > 0 ? Math.round((answered / totalInvited) * 100) : 0;
    const nps = calculateNPS(responses);
    return { totalInvited, answered, pending, responseRate, nps };
  }, [invites, responses]);

  // NPS breakdown
  const npsBreakdown = useMemo(() => {
    const total = responses.length;
    const promoters = responses.filter((r) => r.score >= 9).length;
    const passives = responses.filter((r) => r.score >= 7 && r.score <= 8).length;
    const detractors = responses.filter((r) => r.score <= 6).length;

    return {
      promoters,
      passives,
      detractors,
      promotersPct: total > 0 ? Math.round((promoters / total) * 100) : 0,
      passivesPct: total > 0 ? Math.round((passives / total) * 100) : 0,
      detractorsPct: total > 0 ? Math.round((detractors / total) * 100) : 0,
    };
  }, [responses]);

  // Show toast helper
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showToast = useCallback((message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }, []);

  // Copy link to clipboard
  const handleCopyLink = useCallback(
    async (linkId: string) => {
      try {
        await navigator.clipboard.writeText(buildPublicLink(linkId));
        showToast('Link copied to clipboard!');
      } catch {
        showToast('Failed to copy link.');
      }
    },
    [showToast]
  );

  // Send reminder (demo)
  const handleSendReminder = useCallback(
    (email: string) => {
      showToast(`Reminder sent to ${email}`);
    },
    [showToast]
  );

  // Copy all pending links
  const handleCopyAllPending = useCallback(async () => {
    const pendingInvites = invites.filter((i) => !i.answered);
    if (pendingInvites.length === 0) {
      showToast('No pending invites to copy.');
      return;
    }

    const links = pendingInvites
      .map((inv) => `${inv.employeeEmail}: ${buildPublicLink(inv.linkId)}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(links);
      showToast(`Copied ${pendingInvites.length} pending link(s) to clipboard!`);
    } catch {
      showToast('Failed to copy links.');
    }
  }, [invites, showToast]);

  // Remind all pending
  const handleRemindAllPending = useCallback(() => {
    const pendingInvites = invites.filter((i) => !i.answered);
    if (pendingInvites.length === 0) {
      showToast('No pending invites to remind.');
      return;
    }

    // In a real app, this would send emails to each pending invitee
    showToast(`Reminder sent to ${pendingInvites.length} employee(s)!`);
  }, [invites, showToast]);

  // Close survey
  const handleCloseSurvey = useCallback(() => {
    if (!id) return;
    if (
      !confirm(
        'Are you sure you want to close this survey? No more responses will be accepted.'
      )
    ) {
      return;
    }
    storage.updateENPSSurvey(id, {
      status: 'closed',
      closedAt: new Date().toISOString(),
    });
    setRefreshKey((k) => k + 1);
  }, [id]);

  // ---------------------------------------------------------------------------
  // Not found state
  // ---------------------------------------------------------------------------

  if (!survey) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/enps/surveys')}>
          <ArrowLeft className="size-4" />
          Back to Surveys
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Survey not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate('/enps/surveys')}>
        <ArrowLeft className="size-4" />
        Back to Surveys
      </Button>

      {/* Survey header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{survey.name}</h1>
            <Badge
              className={cn(
                survey.status === 'active'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300'
              )}
            >
              {survey.status === 'active' ? 'Active' : 'Closed'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {formatDate(survey.createdAt)} by{' '}
            {usersMap.get(survey.createdBy) ?? 'Unknown'}
          </p>
        </div>
        {survey.status === 'active' && (
          <Button variant="outline" onClick={handleCloseSurvey}>
            <XCircle className="size-4" />
            Close Survey
          </Button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalInvited}</p>
              <p className="text-xs text-muted-foreground">Total Invited</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.answered}</p>
              <p className="text-xs text-muted-foreground">Answered</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="size-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Send className="size-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.responseRate}%</p>
              <p className="text-xs text-muted-foreground">Response Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="size-5 text-primary" />
            </div>
            <div>
              <p
                className={cn(
                  'text-2xl font-bold',
                  stats.nps > 0
                    ? 'text-green-600 dark:text-green-400'
                    : stats.nps < 0
                      ? 'text-red-600 dark:text-red-400'
                      : ''
                )}
              >
                {responses.length > 0 ? stats.nps : '--'}
              </p>
              <p className="text-xs text-muted-foreground">NPS Score</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NPS Summary breakdown */}
      {responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              NPS Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary counts */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {npsBreakdown.promoters}
                </p>
                <p className="text-xs text-muted-foreground">
                  Promoters (9-10) - {npsBreakdown.promotersPct}%
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {npsBreakdown.passives}
                </p>
                <p className="text-xs text-muted-foreground">
                  Passives (7-8) - {npsBreakdown.passivesPct}%
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {npsBreakdown.detractors}
                </p>
                <p className="text-xs text-muted-foreground">
                  Detractors (0-6) - {npsBreakdown.detractorsPct}%
                </p>
              </div>
            </div>

            {/* Visual bar */}
            <div className="flex h-6 w-full overflow-hidden rounded-full">
              {npsBreakdown.promotersPct > 0 && (
                <div
                  className="flex items-center justify-center bg-green-500 text-xs font-medium text-white transition-all"
                  style={{ width: `${npsBreakdown.promotersPct}%` }}
                >
                  {npsBreakdown.promotersPct >= 10 && `${npsBreakdown.promotersPct}%`}
                </div>
              )}
              {npsBreakdown.passivesPct > 0 && (
                <div
                  className="flex items-center justify-center bg-amber-400 text-xs font-medium text-white transition-all"
                  style={{ width: `${npsBreakdown.passivesPct}%` }}
                >
                  {npsBreakdown.passivesPct >= 10 && `${npsBreakdown.passivesPct}%`}
                </div>
              )}
              {npsBreakdown.detractorsPct > 0 && (
                <div
                  className="flex items-center justify-center bg-red-500 text-xs font-medium text-white transition-all"
                  style={{ width: `${npsBreakdown.detractorsPct}%` }}
                >
                  {npsBreakdown.detractorsPct >= 10 && `${npsBreakdown.detractorsPct}%`}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="inline-block size-3 rounded-full bg-green-500" />
                Promoters
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block size-3 rounded-full bg-amber-400" />
                Passives
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block size-3 rounded-full bg-red-500" />
                Detractors
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk actions bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCopyAllPending}>
          <Copy className="size-4" />
          Copy All Pending Links
        </Button>
        <Button variant="outline" size="sm" onClick={handleRemindAllPending}>
          <Bell className="size-4" />
          Remind All Pending
        </Button>
      </div>

      {/* Invites table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Invite List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Employee Email</th>
                  <th className="hidden whitespace-nowrap px-4 py-3 font-medium md:table-cell">
                    Survey Link
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
                  <th className="hidden whitespace-nowrap px-4 py-3 font-medium sm:table-cell">
                    Sent Date
                  </th>
                  <th className="hidden whitespace-nowrap px-4 py-3 font-medium lg:table-cell">
                    Answered Date
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No invites found for this survey.
                    </td>
                  </tr>
                ) : (
                  invites.map((invite) => (
                    <tr
                      key={invite.id}
                      className="border-b transition-colors last:border-b-0 hover:bg-muted/30"
                    >
                      {/* Email */}
                      <td className="px-4 py-3 font-medium">{invite.employeeEmail}</td>

                      {/* Survey Link */}
                      <td className="hidden px-4 py-3 md:table-cell">
                        <code className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          /public/enps/{invite.linkId}
                        </code>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {invite.answered ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                            Answered
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                            Pending
                          </Badge>
                        )}
                      </td>

                      {/* Sent Date */}
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {formatDate(invite.sentAt)}
                      </td>

                      {/* Answered Date */}
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        {invite.answeredAt ? formatDate(invite.answeredAt) : '--'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(invite.linkId)}
                          >
                            <Copy className="size-3.5" />
                            <span className="hidden sm:inline">Copy Link</span>
                          </Button>
                          {!invite.answered && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendReminder(invite.employeeEmail)}
                            >
                              <Bell className="size-3.5" />
                              <span className="hidden lg:inline">Remind</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-foreground px-4 py-2 text-sm text-background shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}

export default ENPSSurveyDetailPage;
