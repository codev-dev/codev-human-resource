// ============================================================================
// eNPS Dashboard — Analytics & Insights
// ============================================================================

import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { storage } from '@/lib/storage';
import type { ENPSResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart3, Users, TrendingUp, Send, MessageSquare, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_SURVEYS = '__all__';

function calculateNPS(responses: ENPSResponse[]): number {
  if (responses.length === 0) return 0;
  const promoters = responses.filter((r) => r.score >= 9).length;
  const detractors = responses.filter((r) => r.score <= 6).length;
  return Math.round(((promoters - detractors) / responses.length) * 100);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getScoreColor(score: number): string {
  if (score >= 9) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  if (score >= 7) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
}

const COLORS = {
  promoter: '#10b981',
  passive: '#f59e0b',
  detractor: '#ef4444',
  green: '#10b981',
  primary: '#6366f1',
};

function getBarColor(score: number): string {
  if (score >= 9) return COLORS.promoter;
  if (score >= 7) return COLORS.passive;
  return COLORS.detractor;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ENPSDashboardPage() {
  const location = useLocation();
  const [_tick] = useState(() => Date.now());
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(ALL_SURVEYS);

  // ---- Load all data ----
  const { surveys, allInvites, allResponses } = useMemo(
    () => ({
      surveys: storage.getENPSSurveys(),
      allInvites: storage.getENPSInvites(),
      allResponses: storage.getENPSResponses(),
    }),
    [location.key, _tick],
  );

  // ---- Sorted surveys for the dropdown (newest first) ----
  const sortedSurveys = useMemo(
    () =>
      [...surveys].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [surveys],
  );

  // ---- Filter data based on selected survey ----
  const isFiltered = selectedSurveyId !== ALL_SURVEYS;

  const filteredResponses = useMemo(() => {
    if (!isFiltered) return allResponses;
    return allResponses.filter((r) => r.surveyId === selectedSurveyId);
  }, [allResponses, selectedSurveyId, isFiltered]);

  const filteredInvites = useMemo(() => {
    if (!isFiltered) return allInvites;
    return allInvites.filter((inv) => inv.surveyId === selectedSurveyId);
  }, [allInvites, selectedSurveyId, isFiltered]);

  const selectedSurvey = isFiltered
    ? surveys.find((s) => s.id === selectedSurveyId)
    : undefined;

  // ---- Stat cards ----
  const stats = useMemo(() => {
    const nps = calculateNPS(filteredResponses);
    const totalResponses = filteredResponses.length;
    const totalInvites = filteredInvites.length;
    const answeredInvites = filteredInvites.filter((inv) => inv.answered).length;
    const responseRate =
      totalInvites > 0 ? Math.round((answeredInvites / totalInvites) * 100) : 0;
    const activeSurveys = isFiltered
      ? selectedSurvey?.status === 'active'
        ? 1
        : 0
      : surveys.filter((s) => s.status === 'active').length;

    return { nps, totalResponses, responseRate, activeSurveys, totalInvites, answeredInvites };
  }, [filteredResponses, filteredInvites, surveys, isFiltered, selectedSurvey]);

  // ---- NPS trend (always shows all surveys for context) ----
  const trendData = useMemo(() => {
    const sorted = [...surveys].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return sorted.map((survey) => {
      const surveyResponses = allResponses.filter((r) => r.surveyId === survey.id);
      return {
        name: survey.name,
        nps: calculateNPS(surveyResponses),
        isSelected: survey.id === selectedSurveyId,
      };
    });
  }, [surveys, allResponses, selectedSurveyId]);

  // ---- Score distribution (filtered) ----
  const distributionData = useMemo(() => {
    const counts = Array.from({ length: 11 }, (_, i) => ({ score: i, count: 0 }));
    for (const r of filteredResponses) {
      if (r.score >= 0 && r.score <= 10) {
        counts[r.score].count += 1;
      }
    }
    return counts;
  }, [filteredResponses]);

  // ---- Breakdown (filtered) ----
  const breakdownData = useMemo(() => {
    const promoters = filteredResponses.filter((r) => r.score >= 9).length;
    const passives = filteredResponses.filter((r) => r.score >= 7 && r.score <= 8).length;
    const detractors = filteredResponses.filter((r) => r.score <= 6).length;
    const total = filteredResponses.length || 1;

    return [
      { name: 'Promoters', value: promoters, pct: Math.round((promoters / total) * 100), color: COLORS.promoter },
      { name: 'Passives', value: passives, pct: Math.round((passives / total) * 100), color: COLORS.passive },
      { name: 'Detractors', value: detractors, pct: Math.round((detractors / total) * 100), color: COLORS.detractor },
    ];
  }, [filteredResponses]);

  // ---- Response rate per survey (always shows all for comparison) ----
  const responseRateData = useMemo(() => {
    const sorted = [...surveys].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return sorted.map((survey) => {
      const invites = allInvites.filter((inv) => inv.surveyId === survey.id);
      const answered = invites.filter((inv) => inv.answered).length;
      const rate = invites.length > 0 ? Math.round((answered / invites.length) * 100) : 0;
      return { name: survey.name, rate, isSelected: survey.id === selectedSurveyId };
    });
  }, [surveys, allInvites, selectedSurveyId]);

  // ---- Recent comments (filtered) ----
  const recentComments = useMemo(() => {
    return filteredResponses
      .filter((r) => r.comment && r.comment.trim().length > 0)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 10);
  }, [filteredResponses]);

  // ---- NPS color ----
  const npsColorClass =
    stats.nps >= 50
      ? 'text-emerald-600 dark:text-emerald-400'
      : stats.nps >= 0
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';

  const npsIconBg =
    stats.nps >= 50
      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
      : stats.nps >= 0
        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
        : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400';

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Page header + filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">eNPS Dashboard</h1>
          <p className="text-muted-foreground">
            Employee Net Promoter Score analytics and insights
          </p>
        </div>

        {/* Survey filter */}
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select survey" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SURVEYS}>All Surveys</SelectItem>
              {sortedSurveys.map((survey) => (
                <SelectItem key={survey.id} value={survey.id}>
                  <span className="flex items-center gap-2">
                    {survey.name}
                    {survey.status === 'active' && (
                      <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active filter indicator */}
      {isFiltered && selectedSurvey && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <Badge variant="outline" className="shrink-0">
            {selectedSurvey.status === 'active' ? 'Active' : 'Closed'}
          </Badge>
          <div className="min-w-0 flex-1 text-sm">
            Viewing <span className="font-semibold">{selectedSurvey.name}</span>
            <span className="text-muted-foreground">
              {' '}&middot; Created {formatDate(selectedSurvey.createdAt)}
              {selectedSurvey.closedAt && ` · Closed ${formatDate(selectedSurvey.closedAt)}`}
            </span>
          </div>
          <button
            onClick={() => setSelectedSurveyId(ALL_SURVEYS)}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Row 1: Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {isFiltered ? 'Survey NPS' : 'Current NPS Score'}
                </p>
                <p className={cn('text-3xl font-bold tracking-tight', npsColorClass)}>
                  {stats.nps > 0 ? `+${stats.nps}` : String(stats.nps)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isFiltered ? selectedSurvey?.name : 'Most recent survey'}
                </p>
              </div>
              <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', npsIconBg)}>
                <TrendingUp className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Responses</p>
                <p className="text-3xl font-bold tracking-tight">{stats.totalResponses}</p>
                <p className="text-xs text-muted-foreground">
                  {isFiltered ? `of ${stats.totalInvites} invited` : 'Across all surveys'}
                </p>
              </div>
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                <Users className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-3xl font-bold tracking-tight">{stats.responseRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {isFiltered
                    ? `${stats.answeredInvites} of ${stats.totalInvites} responded`
                    : 'Overall completion'}
                </p>
              </div>
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                <Send className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {isFiltered ? 'Survey Status' : 'Active Surveys'}
                </p>
                <p className="text-3xl font-bold tracking-tight">
                  {isFiltered
                    ? selectedSurvey?.status === 'active'
                      ? 'Active'
                      : 'Closed'
                    : stats.activeSurveys}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isFiltered ? `${stats.totalInvites} employees invited` : 'Currently running'}
                </p>
              </div>
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                <BarChart3 className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: NPS Trend (60%) + Pie (40%) */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>NPS Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis domain={[-100, 100]} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip
                      formatter={(value: number | undefined) => [value ?? 0, 'NPS']}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      labelFormatter={(label: any) => String(label)}
                    />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="nps"
                      stroke={COLORS.primary}
                      strokeWidth={2}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        const highlighted = payload?.isSelected && isFiltered;
                        return (
                          <circle
                            key={`dot-${cx}-${cy}`}
                            cx={cx ?? 0}
                            cy={cy ?? 0}
                            r={highlighted ? 8 : 5}
                            fill={COLORS.primary}
                            stroke={highlighted ? '#fff' : 'none'}
                            strokeWidth={highlighted ? 2 : 0}
                          />
                        );
                      }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No survey data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Score Breakdown
              {isFiltered && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({selectedSurvey?.name})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {filteredResponses.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdownData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      label={({ name, pct }: any) => `${name} ${pct}%`}
                    >
                      {breakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number | undefined) => [value ?? 0, 'Responses']} />
                    <Legend verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No response data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Score Distribution (50%) + Response Rate (50%) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Score Distribution
              {isFiltered && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({selectedSurvey?.name})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {filteredResponses.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="score" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number | undefined) => [value ?? 0, 'Responses']}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      labelFormatter={(label: any) => `Score: ${label}`}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {distributionData.map((entry, index) => (
                        <Cell key={`dist-${index}`} fill={getBarColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No response data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Rate by Survey</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {responseRateData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={responseRateData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                      tickFormatter={(value: number) => `${value}%`}
                    />
                    <Tooltip
                      formatter={(value: number | undefined) => [`${value ?? 0}%`, 'Response Rate']}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      labelFormatter={(label: any) => String(label)}
                    />
                    <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                      {responseRateData.map((entry, index) => (
                        <Cell
                          key={`rate-${index}`}
                          fill={entry.isSelected && isFiltered ? COLORS.primary : COLORS.green}
                          opacity={isFiltered && !entry.isSelected ? 0.3 : 1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No survey data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Recent Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="size-5" />
            Recent Comments
            {isFiltered && (
              <span className="text-xs font-normal text-muted-foreground">
                ({selectedSurvey?.name})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentComments.length > 0 ? (
            <div className="space-y-4">
              {recentComments.map((response) => (
                <div key={response.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <Badge className={cn('shrink-0 tabular-nums', getScoreColor(response.score))}>
                    {response.score}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed">{response.comment}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(response.submittedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              {isFiltered ? 'No comments for this survey' : 'No comments submitted yet'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ENPSDashboardPage;
