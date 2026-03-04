import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { storage } from '@/lib/storage';
import { useAuthStore } from '@/stores/auth-store';
import type { EvalAnswer, EvalQuestion, EvalTemplate, Evaluation, Employee } from '@/types';
import {
  ClipboardEdit,
  ChevronDown,
  ChevronRight,
  Save,
  SendHorizontal,
  Star,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Building2,
  FileText,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateQuestionScore(question: EvalQuestion, value: string | number | boolean): number {
  if (question.type === 'rating' && typeof value === 'number') {
    const maxRating = question.maxRating ?? 5;
    return (value / maxRating) * question.weight;
  }
  if (question.type === 'yes_no') {
    return value === true ? question.weight : 0;
  }
  // text and dropdown are not numerically scored
  return 0;
}

function computeMaxScore(questions: EvalQuestion[]): number {
  return questions.reduce((sum, q) => sum + q.weight, 0);
}

function computeTotalScore(questions: EvalQuestion[], answers: Map<string, EvalAnswer>): number {
  let total = 0;
  for (const q of questions) {
    const ans = answers.get(q.id);
    if (ans) total += ans.score;
  }
  return total;
}

function groupByCategory(questions: EvalQuestion[]): Map<string, EvalQuestion[]> {
  const map = new Map<string, EvalQuestion[]>();
  for (const q of questions) {
    const group = map.get(q.category) ?? [];
    group.push(q);
    map.set(q.category, group);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Rating Input
// ---------------------------------------------------------------------------

function RatingInput({
  maxRating,
  value,
  onChange,
  disabled,
}: {
  maxRating: number;
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRating }, (_, i) => {
        const rating = i + 1;
        const isActive = (hovered ?? value ?? 0) >= rating;
        return (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            className="group/star rounded p-0.5 transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            onMouseEnter={() => setHovered(rating)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(rating)}
            title={`${rating} / ${maxRating}`}
          >
            <Star
              className={`size-6 transition-colors ${
                isActive
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-transparent text-muted-foreground/40'
              }`}
            />
          </button>
        );
      })}
      {value != null && (
        <span className="ml-2 text-sm font-medium text-muted-foreground">
          {value}/{maxRating}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Yes/No Toggle
// ---------------------------------------------------------------------------

function YesNoToggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={value === true ? 'default' : 'outline'}
        size="sm"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={value === true ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}
      >
        <CheckCircle2 className="size-4" />
        Yes
      </Button>
      <Button
        type="button"
        variant={value === false ? 'default' : 'outline'}
        size="sm"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={value === false ? 'bg-red-600 text-white hover:bg-red-700' : ''}
      >
        <XCircle className="size-4" />
        No
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible Category Section
// ---------------------------------------------------------------------------

function CategorySection({
  category,
  questions,
  answers,
  errors,
  onAnswer,
  disabled,
  defaultExpanded,
}: {
  category: string;
  questions: EvalQuestion[];
  answers: Map<string, EvalAnswer>;
  errors: Set<string>;
  onAnswer: (questionId: string, value: string | number | boolean) => void;
  disabled: boolean;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const answeredCount = questions.filter((q) => answers.has(q.id)).length;

  return (
    <Card>
      <button
        type="button"
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-muted/30"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
          <span className="font-medium">{category}</span>
        </div>
        <Badge variant="outline" className="shrink-0">
          {answeredCount}/{questions.length} answered
        </Badge>
      </button>

      {expanded && (
        <CardContent className="space-y-6 border-t pt-6">
          {questions.map((q, idx) => {
            const answer = answers.get(q.id);
            const hasError = errors.has(q.id);

            return (
              <div key={q.id} className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {idx + 1}
                  </span>
                  <div className="flex-1 space-y-1">
                    <Label className="text-sm leading-relaxed">
                      {q.text}
                      <span className="ml-1 text-xs text-muted-foreground">(weight: {q.weight})</span>
                    </Label>

                    {hasError && (
                      <p className="flex items-center gap-1 text-xs text-destructive" id={`error-${q.id}`}>
                        <AlertTriangle className="size-3" />
                        This question requires an answer
                      </p>
                    )}

                    <div className="pt-1">
                      {q.type === 'rating' && (
                        <RatingInput
                          maxRating={q.maxRating ?? 5}
                          value={answer ? (answer.value as number) : null}
                          onChange={(v) => onAnswer(q.id, v)}
                          disabled={disabled}
                        />
                      )}

                      {q.type === 'text' && (
                        <Textarea
                          placeholder="Enter your response..."
                          value={answer ? String(answer.value) : ''}
                          onChange={(e) => onAnswer(q.id, e.target.value)}
                          disabled={disabled}
                          className="min-h-24"
                          aria-invalid={hasError}
                        />
                      )}

                      {q.type === 'dropdown' && q.options && (
                        <Select
                          value={answer ? String(answer.value) : ''}
                          onValueChange={(v) => onAnswer(q.id, v)}
                          disabled={disabled}
                        >
                          <SelectTrigger className="w-full sm:w-72" aria-invalid={hasError}>
                            <SelectValue placeholder="Select an option..." />
                          </SelectTrigger>
                          <SelectContent>
                            {q.options.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {q.type === 'yes_no' && (
                        <YesNoToggle
                          value={answer ? (answer.value as boolean) : null}
                          onChange={(v) => onAnswer(q.id, v)}
                          disabled={disabled}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {idx < questions.length - 1 && <Separator className="mt-4" />}
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function EvalFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);

  // Load data
  const evaluation = useMemo(() => (id ? storage.getEvaluation(id) : undefined), [id]);
  const template = useMemo(
    () => (evaluation ? storage.getEvalTemplate(evaluation.templateId) : undefined),
    [evaluation]
  );
  const employee = useMemo(
    () => (evaluation ? storage.getEmployee(evaluation.employeeId) : undefined),
    [evaluation]
  );

  // Answers state: Map<questionId, EvalAnswer>
  const [answers, setAnswers] = useState<Map<string, EvalAnswer>>(() => {
    const map = new Map<string, EvalAnswer>();
    if (evaluation?.answers) {
      evaluation.answers.forEach((a) => map.set(a.questionId, a));
    }
    return map;
  });

  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isDirtyRef = useRef(false);

  const questions = template?.questions ?? [];
  const maxScore = useMemo(() => computeMaxScore(questions), [questions]);
  const totalScore = useMemo(() => computeTotalScore(questions, answers), [questions, answers]);
  const answeredCount = answers.size;
  const totalQuestions = questions.length;

  const isReadOnly =
    !evaluation ||
    evaluation.status === 'submitted' ||
    evaluation.status === 'approved' ||
    evaluation.status === 'hr_review' ||
    currentUser?.role === 'viewer';

  // Group questions by category
  const categoryGroups = useMemo(() => groupByCategory(questions), [questions]);

  // Handle answer change
  const handleAnswer = useCallback(
    (questionId: string, value: string | number | boolean) => {
      const question = questions.find((q) => q.id === questionId);
      if (!question) return;

      const score = calculateQuestionScore(question, value);
      const answer: EvalAnswer = { questionId, value, score };

      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(questionId, answer);
        return next;
      });

      // Clear error for this question
      setErrors((prev) => {
        if (!prev.has(questionId)) return prev;
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });

      isDirtyRef.current = true;
    },
    [questions]
  );

  // Save draft
  const saveDraft = useCallback(() => {
    if (!evaluation || !id) return;

    setIsSaving(true);
    const answersArray = Array.from(answers.values());
    const currentTotal = computeTotalScore(questions, answers);

    const newStatus =
      evaluation.status === 'due' || evaluation.status === 'overdue'
        ? 'in_progress'
        : evaluation.status;

    storage.updateEvaluation(id, {
      answers: answersArray,
      totalScore: currentTotal,
      status: newStatus,
      startedDate: evaluation.startedDate ?? new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    });

    isDirtyRef.current = false;
    const now = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setAutoSavedAt(now);
    setIsSaving(false);
  }, [evaluation, id, answers, questions]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (isReadOnly) return;

    const interval = setInterval(() => {
      if (isDirtyRef.current) {
        saveDraft();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isReadOnly, saveDraft]);

  // Validate and submit
  const handleSubmit = useCallback(() => {
    if (!evaluation || !id || !template) return;

    // Check all questions are answered
    const unanswered = new Set<string>();
    for (const q of questions) {
      const ans = answers.get(q.id);
      if (!ans) {
        unanswered.add(q.id);
        continue;
      }
      // Check for empty text
      if (q.type === 'text' && (!ans.value || String(ans.value).trim() === '')) {
        unanswered.add(q.id);
      }
      // Check for empty dropdown
      if (q.type === 'dropdown' && (!ans.value || String(ans.value).trim() === '')) {
        unanswered.add(q.id);
      }
    }

    if (unanswered.size > 0) {
      setErrors(unanswered);
      // Scroll to first error
      const firstErrorId = questions.find((q) => unanswered.has(q.id))?.id;
      if (firstErrorId) {
        const el = document.getElementById(`error-${firstErrorId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // All valid — submit
    const answersArray = Array.from(answers.values());
    const finalScore = computeTotalScore(questions, answers);

    storage.updateEvaluation(id, {
      answers: answersArray,
      totalScore: finalScore,
      maxScore,
      status: 'submitted',
      submittedDate: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    });

    navigate(`/evaluations/${id}`);
  }, [evaluation, id, template, questions, answers, maxScore, navigate]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!evaluation || !template || !employee) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertTriangle className="size-10 text-muted-foreground" />
          <p className="mt-3 text-lg font-medium">Evaluation not found</p>
          <p className="text-sm text-muted-foreground">
            The evaluation you are looking for does not exist or has been removed.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/evaluations')}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  const scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ClipboardEdit className="size-6 text-primary" />
          {isReadOnly ? 'View Evaluation' : 'Evaluation Form'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{template.name}</p>
      </div>

      {/* Employee Info Header */}
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <User className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">
                {employee.firstName} {employee.lastName}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="size-3.5" />
                  {employee.department}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="size-3.5" />
                  {employee.employeeId}
                </span>
                <Badge variant="outline" className="capitalize">
                  {evaluation.type}
                </Badge>
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{answeredCount}</span> /{' '}
            {totalQuestions} questions answered
          </div>
        </CardContent>
      </Card>

      {/* Score progress bar */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Score</p>
              <p className="text-2xl font-bold">
                {totalScore.toFixed(1)}
                <span className="text-base font-normal text-muted-foreground">/{maxScore}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{scorePercentage}%</p>
            </div>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(scorePercentage, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Rating and Yes/No questions are scored. Text and dropdown fields show N/A for scoring.
          </p>
        </CardContent>
      </Card>

      {/* Auto-save indicator + action buttons (sticky top) */}
      {!isReadOnly && (
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border bg-background/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {isSaving ? (
              <>
                <Clock className="size-4 animate-spin" />
                Saving...
              </>
            ) : autoSavedAt ? (
              <>
                <CheckCircle2 className="size-4 text-emerald-500" />
                Auto-saved at {autoSavedAt}
              </>
            ) : (
              <>
                <Clock className="size-4" />
                Auto-saves every 30 seconds
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={saveDraft}>
              <Save className="size-4" />
              Save Draft
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm">
                  <SendHorizontal className="size-4" />
                  Submit Evaluation
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit Evaluation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Once submitted, this evaluation will be sent for HR review. You will not be able
                    to make further changes. Make sure all questions are answered.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Rejection reason banner */}
      {evaluation.status === 'rejected' && evaluation.rejectionReason && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-red-700 dark:text-red-300">Evaluation Rejected</p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {evaluation.rejectionReason}
            </p>
          </div>
        </div>
      )}

      {/* Question categories */}
      <div className="space-y-4">
        {Array.from(categoryGroups.entries()).map(([category, qs]) => (
          <CategorySection
            key={category}
            category={category}
            questions={qs}
            answers={answers}
            errors={errors}
            onAnswer={handleAnswer}
            disabled={isReadOnly}
            defaultExpanded={true}
          />
        ))}
      </div>

      {/* Bottom action bar */}
      {!isReadOnly && (
        <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
          <Button variant="outline" onClick={() => navigate('/evaluations')}>
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={saveDraft}>
              <Save className="size-4" />
              Save Draft
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button>
                  <SendHorizontal className="size-4" />
                  Submit Evaluation
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit Evaluation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Once submitted, this evaluation will be sent for HR review. Make sure all
                    questions are answered before proceeding.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {isReadOnly && (
        <div className="flex items-center justify-start rounded-lg border bg-background px-4 py-3">
          <Button variant="outline" onClick={() => navigate('/evaluations')}>
            Back to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}

export default EvalFormPage;
