import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { storage, initializeData } from '@/lib/storage';
import type { EvalTemplate, EvalAnswer, PublicFormSubmission, EvalQuestion } from '@/types';
import {
  ClipboardList,
  Star,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  ChevronDown,
  ChevronRight,
  LinkIcon,
  XCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function calculateScore(question: EvalQuestion, value: string | number | boolean): number {
  if (question.type === 'rating') {
    const numVal = typeof value === 'number' ? value : Number(value);
    if (isNaN(numVal) || !question.maxRating) return 0;
    return Math.round((numVal / question.maxRating) * question.weight * 100) / 100;
  }
  if (question.type === 'yes_no') {
    return value === true || value === 'true' ? question.weight : 0;
  }
  // text and dropdown don't contribute to score
  return 0;
}

// ---------------------------------------------------------------------------
// Rating Input
// ---------------------------------------------------------------------------

function RatingInput({
  maxRating,
  value,
  onChange,
  error,
}: {
  maxRating: number;
  value: number | null;
  onChange: (val: number) => void;
  error?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div>
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: maxRating }, (_, i) => {
          const num = i + 1;
          const isActive = value !== null && num <= value;
          const isHoveredActive = hovered !== null && num <= hovered;
          return (
            <button
              key={num}
              type="button"
              className={`flex size-10 items-center justify-center rounded-lg border-2 text-sm font-semibold transition-all ${
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : isHoveredActive
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border bg-background hover:border-primary/30 hover:bg-muted'
              }`}
              onClick={() => onChange(num)}
              onMouseEnter={() => setHovered(num)}
              onMouseLeave={() => setHovered(null)}
            >
              {num}
            </button>
          );
        })}
      </div>
      {value !== null && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {value} / {maxRating}
        </p>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Yes/No Input
// ---------------------------------------------------------------------------

function YesNoInput({
  value,
  onChange,
  error,
}: {
  value: boolean | null;
  onChange: (val: boolean) => void;
  error?: string;
}) {
  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          className={`rounded-lg border-2 px-6 py-2 text-sm font-medium transition-all ${
            value === true
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : 'border-border bg-background hover:border-emerald-300 hover:bg-emerald-50/50'
          }`}
          onClick={() => onChange(true)}
        >
          Yes
        </button>
        <button
          type="button"
          className={`rounded-lg border-2 px-6 py-2 text-sm font-medium transition-all ${
            value === false
              ? 'border-red-500 bg-red-50 text-red-700'
              : 'border-border bg-background hover:border-red-300 hover:bg-red-50/50'
          }`}
          onClick={() => onChange(false)}
        >
          No
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Public Eval Form
// ---------------------------------------------------------------------------

export function PublicEvalFormPage() {
  // Initialize data if needed (user might land directly on this URL)
  useMemo(() => initializeData(), []);

  const { linkId } = useParams<{ linkId: string }>();

  // Find the template by public link ID
  const template = useMemo(() => {
    const templates = storage.getEvalTemplates();
    return templates.find((t) => t.publicLinkId === linkId);
  }, [linkId]);

  // State
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [respondentEmployeeId, setRespondentEmployeeId] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Initialize all categories as expanded
  useMemo(() => {
    if (template) {
      const cats = new Set(template.questions.map((q) => q.category));
      setExpandedCategories(cats);
    }
  }, [template]);

  // Group questions by category
  const categories = useMemo(() => {
    if (!template) return [];
    const catMap = new Map<string, EvalQuestion[]>();
    template.questions.forEach((q) => {
      const list = catMap.get(q.category) || [];
      list.push(q);
      catMap.set(q.category, list);
    });
    return Array.from(catMap.entries()).map(([name, questions]) => ({ name, questions }));
  }, [template]);

  // Scoring
  const { currentScore, maxScore, answeredCount } = useMemo(() => {
    if (!template) return { currentScore: 0, maxScore: 0, answeredCount: 0 };

    let score = 0;
    let max = 0;
    let count = 0;

    template.questions.forEach((q) => {
      if (q.type === 'rating' || q.type === 'yes_no') {
        max += q.weight;
      }
      const val = answers[q.id];
      if (val !== undefined && val !== '') {
        count++;
        score += calculateScore(q, val);
      }
    });

    return { currentScore: Math.round(score * 100) / 100, maxScore: max, answeredCount: count };
  }, [template, answers]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const updateAnswer = (questionId: string, value: string | number | boolean) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => ({ ...prev, [questionId]: '' }));
  };

  const validate = useCallback((): boolean => {
    if (!template) return false;
    const errs: Record<string, string> = {};

    if (!respondentName.trim()) errs.name = 'Your name is required';
    if (!respondentEmail.trim()) errs.email = 'Your email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(respondentEmail)) errs.email = 'Please enter a valid email';

    template.questions.forEach((q) => {
      const val = answers[q.id];
      if (val === undefined || val === '') {
        errs[q.id] = 'This question requires an answer';
      }
    });

    setErrors(errs);

    // Scroll to first error
    if (Object.keys(errs).length > 0) {
      const firstErrorKey = Object.keys(errs)[0];
      const el = document.getElementById(`q-${firstErrorKey}`) || document.getElementById(`field-${firstErrorKey}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return Object.keys(errs).length === 0;
  }, [template, answers, respondentName, respondentEmail]);

  const handleSubmit = useCallback(() => {
    if (!template || !validate()) return;

    setIsSubmitting(true);

    // Simulate brief delay
    setTimeout(() => {
      const evalAnswers: EvalAnswer[] = template.questions.map((q) => ({
        questionId: q.id,
        value: answers[q.id],
        score: calculateScore(q, answers[q.id]),
      }));

      const totalScore = evalAnswers.reduce((sum, a) => sum + a.score, 0);
      const max = template.questions
        .filter((q) => q.type === 'rating' || q.type === 'yes_no')
        .reduce((sum, q) => sum + q.weight, 0);

      const submission: PublicFormSubmission = {
        id: generateId('psub'),
        templateId: template.id,
        respondentName: respondentName.trim(),
        respondentEmail: respondentEmail.trim(),
        respondentEmployeeId: respondentEmployeeId.trim() || undefined,
        answers: evalAnswers,
        totalScore: Math.round(totalScore * 100) / 100,
        maxScore: max,
        submittedAt: new Date().toISOString(),
      };

      storage.createPublicSubmission(submission);
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 800);
  }, [template, answers, respondentName, respondentEmail, respondentEmployeeId, validate]);

  // ---------------------------------------------------------------------------
  // Error states
  // ---------------------------------------------------------------------------

  if (!template) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <XCircle className="size-16 text-destructive/50" />
            <h1 className="mt-4 text-xl font-semibold">Form Not Found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This evaluation form link is invalid or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!template.publicLinkActive) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <LinkIcon className="size-16 text-amber-500/50" />
            <h1 className="mt-4 text-xl font-semibold">Form Inactive</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This evaluation form is currently deactivated. Please contact your supervisor or HR.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (template.questions.length === 0) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertTriangle className="size-16 text-amber-500/50" />
            <h1 className="mt-4 text-xl font-semibold">Form Not Ready</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This evaluation form has no questions yet. Please contact your supervisor or HR.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Success state
  // ---------------------------------------------------------------------------

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="size-10 text-emerald-600" />
            </div>
            <h1 className="mt-6 text-2xl font-semibold">Response Submitted!</h1>
            <p className="mt-2 text-muted-foreground">
              Thank you, {respondentName}. Your evaluation response has been recorded.
            </p>
            {maxScore > 0 && (
              <div className="mt-6 rounded-lg border bg-muted/30 px-6 py-4">
                <p className="text-sm text-muted-foreground">Your Score</p>
                <p className="text-3xl font-bold mt-1">
                  {Math.round((currentScore / maxScore) * 100)}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentScore} / {maxScore} points
                </p>
              </div>
            )}
            <p className="mt-6 text-xs text-muted-foreground">
              You can safely close this page now.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main form
  // ---------------------------------------------------------------------------

  const scorePercent = maxScore > 0 ? Math.round((currentScore / maxScore) * 100) : 0;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{template.name}</h1>
              <p className="text-sm text-muted-foreground capitalize">
                {template.type} Evaluation
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Score bar (sticky) */}
        <div className="sticky top-0 z-10 rounded-lg border bg-background p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Progress: {answeredCount} / {template.questions.length} answered
            </span>
            {maxScore > 0 && (
              <span className="text-sm font-semibold">
                Score: {currentScore} / {maxScore} ({scorePercent}%)
              </span>
            )}
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(answeredCount / template.questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Respondent info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Information</CardTitle>
            <CardDescription>Please provide your details before answering the evaluation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5" id="field-name">
                <Label htmlFor="respondent-name">Full Name *</Label>
                <Input
                  id="respondent-name"
                  placeholder="Enter your full name"
                  value={respondentName}
                  onChange={(e) => { setRespondentName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-1.5" id="field-email">
                <Label htmlFor="respondent-email">Email Address *</Label>
                <Input
                  id="respondent-email"
                  type="email"
                  placeholder="Enter your email"
                  value={respondentEmail}
                  onChange={(e) => { setRespondentEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="respondent-empid">Employee ID (optional)</Label>
                <Input
                  id="respondent-empid"
                  placeholder="e.g., EMP-001"
                  value={respondentEmployeeId}
                  onChange={(e) => setRespondentEmployeeId(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question categories */}
        {categories.map((cat) => {
          const isExpanded = expandedCategories.has(cat.name);
          const answeredInCat = cat.questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== '').length;

          return (
            <Card key={cat.name}>
              <CardHeader>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 text-left"
                  onClick={() => toggleCategory(cat.name)}
                >
                  {isExpanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-base">{cat.name}</CardTitle>
                  </div>
                  <Badge variant={answeredInCat === cat.questions.length ? 'default' : 'secondary'}>
                    {answeredInCat} / {cat.questions.length}
                  </Badge>
                </button>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-6">
                  {cat.questions.map((q, idx) => (
                    <div key={q.id} id={`q-${q.id}`} className="space-y-3">
                      {idx > 0 && <Separator />}
                      <div className="flex items-start gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                          {template.questions.indexOf(q) + 1}
                        </span>
                        <div className="flex-1 space-y-3">
                          <p className="text-sm font-medium leading-relaxed">{q.text}</p>

                          {q.type === 'rating' && (
                            <RatingInput
                              maxRating={q.maxRating || 5}
                              value={typeof answers[q.id] === 'number' ? answers[q.id] as number : null}
                              onChange={(val) => updateAnswer(q.id, val)}
                              error={errors[q.id]}
                            />
                          )}

                          {q.type === 'text' && (
                            <div>
                              <Textarea
                                placeholder="Type your response..."
                                value={typeof answers[q.id] === 'string' ? answers[q.id] as string : ''}
                                onChange={(e) => updateAnswer(q.id, e.target.value)}
                                className={errors[q.id] ? 'border-destructive' : ''}
                              />
                              {errors[q.id] && <p className="mt-1 text-xs text-destructive">{errors[q.id]}</p>}
                            </div>
                          )}

                          {q.type === 'dropdown' && (
                            <div>
                              <Select
                                value={typeof answers[q.id] === 'string' ? answers[q.id] as string : ''}
                                onValueChange={(v) => updateAnswer(q.id, v)}
                              >
                                <SelectTrigger className={`w-full ${errors[q.id] ? 'border-destructive' : ''}`}>
                                  <SelectValue placeholder="Select an option..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {(q.options || []).map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {errors[q.id] && <p className="mt-1 text-xs text-destructive">{errors[q.id]}</p>}
                            </div>
                          )}

                          {q.type === 'yes_no' && (
                            <YesNoInput
                              value={answers[q.id] !== undefined ? Boolean(answers[q.id]) : null}
                              onChange={(val) => updateAnswer(q.id, val)}
                              error={errors[q.id]}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* Submit section */}
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  {answeredCount === template.questions.length
                    ? 'All questions answered. Ready to submit!'
                    : `${template.questions.length - answeredCount} question${template.questions.length - answeredCount !== 1 ? 's' : ''} remaining`}
                </p>
                {maxScore > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current score: {currentScore} / {maxScore} ({scorePercent}%)
                  </p>
                )}
              </div>
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Submit Evaluation
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground py-4">
          CoDev HRM &mdash; Evaluation Form
        </p>
      </div>
    </div>
  );
}

export default PublicEvalFormPage;
