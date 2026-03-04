import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { storage } from '@/lib/storage';
import type { EvalTemplate, EvalQuestion, QuestionType, EvalType, PublicFormSubmission } from '@/types';
import {
  FileText,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  PencilLine,
  X,
  Star,
  Type,
  List,
  ToggleLeft,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Eye,
  ClipboardList,
  Users,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function generatePublicLinkId() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

function getQuestionTypeIcon(type: QuestionType) {
  switch (type) {
    case 'rating': return Star;
    case 'text': return Type;
    case 'dropdown': return List;
    case 'yes_no': return ToggleLeft;
  }
}

function getQuestionTypeLabel(type: QuestionType) {
  switch (type) {
    case 'rating': return 'Rating';
    case 'text': return 'Text';
    case 'dropdown': return 'Dropdown';
    case 'yes_no': return 'Yes / No';
  }
}

// ---------------------------------------------------------------------------
// Toast-style save feedback
// ---------------------------------------------------------------------------

function SaveFeedback({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border bg-background px-4 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-4">
      <CheckCircle2 className="size-4 text-emerald-500" />
      <span className="text-sm font-medium">Template saved</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Question Form
// ---------------------------------------------------------------------------

interface NewQuestionFormProps {
  onAdd: (question: EvalQuestion) => void;
  onCancel: () => void;
  existingCategories: string[];
}

function NewQuestionForm({ onAdd, onCancel, existingCategories }: NewQuestionFormProps) {
  const [text, setText] = useState('');
  const [type, setType] = useState<QuestionType>('rating');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [weight, setWeight] = useState('10');
  const [maxRating, setMaxRating] = useState('5');
  const [optionsStr, setOptionsStr] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resolvedCategory = category === '__custom__' ? customCategory.trim() : category;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!text.trim()) errs.text = 'Question text is required';
    if (!resolvedCategory) errs.category = 'Category is required';
    if (!weight || Number(weight) <= 0) errs.weight = 'Weight must be greater than 0';
    if (type === 'rating' && (!maxRating || Number(maxRating) < 2)) errs.maxRating = 'Max rating must be at least 2';
    if (type === 'dropdown' && !optionsStr.trim()) errs.options = 'At least one option is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAdd = () => {
    if (!validate()) return;

    const question: EvalQuestion = {
      id: generateId('q'),
      text: text.trim(),
      type,
      category: resolvedCategory,
      weight: Number(weight) || 10,
    };

    if (type === 'rating') {
      question.maxRating = Number(maxRating) || 5;
    }
    if (type === 'dropdown' && optionsStr.trim()) {
      question.options = optionsStr.split(',').map((o) => o.trim()).filter(Boolean);
    }

    onAdd(question);
  };

  return (
    <div className="space-y-4 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-5">
      <div className="flex items-center gap-2">
        <Plus className="size-4 text-primary" />
        <p className="text-sm font-semibold text-primary">Add New Question</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="q-text">Question Text *</Label>
          <Textarea
            id="q-text"
            placeholder="Enter the question text..."
            value={text}
            onChange={(e) => { setText(e.target.value); setErrors((p) => ({ ...p, text: '' })); }}
            className={errors.text ? 'border-destructive' : ''}
          />
          {errors.text && <p className="text-xs text-destructive">{errors.text}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="q-type">Question Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
            <SelectTrigger id="q-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Rating Scale</SelectItem>
              <SelectItem value="text">Text Response</SelectItem>
              <SelectItem value="dropdown">Dropdown Select</SelectItem>
              <SelectItem value="yes_no">Yes / No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="q-category">Category *</Label>
          {existingCategories.length > 0 ? (
            <>
              <Select
                value={category}
                onValueChange={(v) => { setCategory(v); setErrors((p) => ({ ...p, category: '' })); }}
              >
                <SelectTrigger id="q-category" className={`w-full ${errors.category ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {existingCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">+ New Category</SelectItem>
                </SelectContent>
              </Select>
              {category === '__custom__' && (
                <Input
                  placeholder="Enter new category name..."
                  value={customCategory}
                  onChange={(e) => { setCustomCategory(e.target.value); setErrors((p) => ({ ...p, category: '' })); }}
                  className={errors.category ? 'border-destructive' : ''}
                />
              )}
            </>
          ) : (
            <Input
              id="q-category"
              placeholder="e.g., Job Performance"
              value={customCategory}
              onChange={(e) => { setCustomCategory(e.target.value); setCategory('__custom__'); setErrors((p) => ({ ...p, category: '' })); }}
              className={errors.category ? 'border-destructive' : ''}
            />
          )}
          {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="q-weight">Weight *</Label>
          <Input
            id="q-weight"
            type="number"
            min={1}
            max={100}
            value={weight}
            onChange={(e) => { setWeight(e.target.value); setErrors((p) => ({ ...p, weight: '' })); }}
            className={errors.weight ? 'border-destructive' : ''}
          />
          {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
        </div>

        {type === 'rating' && (
          <div className="space-y-1.5">
            <Label htmlFor="q-max-rating">Max Rating *</Label>
            <Input
              id="q-max-rating"
              type="number"
              min={2}
              max={10}
              value={maxRating}
              onChange={(e) => { setMaxRating(e.target.value); setErrors((p) => ({ ...p, maxRating: '' })); }}
              className={errors.maxRating ? 'border-destructive' : ''}
            />
            {errors.maxRating && <p className="text-xs text-destructive">{errors.maxRating}</p>}
          </div>
        )}

        {type === 'dropdown' && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="q-options">Options (comma-separated) *</Label>
            <Input
              id="q-options"
              placeholder="Option 1, Option 2, Option 3"
              value={optionsStr}
              onChange={(e) => { setOptionsStr(e.target.value); setErrors((p) => ({ ...p, options: '' })); }}
              className={errors.options ? 'border-destructive' : ''}
            />
            {errors.options && <p className="text-xs text-destructive">{errors.options}</p>}
            {optionsStr.trim() && (
              <div className="flex flex-wrap gap-1 mt-1">
                {optionsStr.split(',').map((o) => o.trim()).filter(Boolean).map((opt, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{opt}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" onClick={handleAdd}>
          <Plus className="size-4" />
          Add Question
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Question Editor
// ---------------------------------------------------------------------------

interface QuestionEditorProps {
  question: EvalQuestion;
  onSave: (updated: EvalQuestion) => void;
  onCancel: () => void;
  existingCategories: string[];
}

function QuestionEditor({ question, onSave, onCancel, existingCategories }: QuestionEditorProps) {
  const [text, setText] = useState(question.text);
  const [type, setType] = useState<QuestionType>(question.type);
  const [category, setCategory] = useState(question.category);
  const [weight, setWeight] = useState(String(question.weight));
  const [maxRating, setMaxRating] = useState(String(question.maxRating ?? 5));
  const [optionsStr, setOptionsStr] = useState((question.options ?? []).join(', '));

  const handleSave = () => {
    if (!text.trim() || !category.trim()) return;

    const updated: EvalQuestion = {
      ...question,
      text: text.trim(),
      type,
      category: category.trim(),
      weight: Number(weight) || 10,
    };

    if (type === 'rating') {
      updated.maxRating = Number(maxRating) || 5;
    } else {
      delete updated.maxRating;
    }

    if (type === 'dropdown' && optionsStr.trim()) {
      updated.options = optionsStr.split(',').map((o) => o.trim()).filter(Boolean);
    } else {
      delete updated.options;
    }

    onSave(updated);
  };

  return (
    <div className="space-y-3 rounded-lg border-2 border-primary/30 bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <PencilLine className="size-4 text-primary" />
        <p className="text-sm font-semibold">Edit Question</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Question Text</Label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-16" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Rating Scale</SelectItem>
              <SelectItem value="text">Text Response</SelectItem>
              <SelectItem value="dropdown">Dropdown Select</SelectItem>
              <SelectItem value="yes_no">Yes / No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {existingCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Weight</Label>
          <Input type="number" min={1} max={100} value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>

        {type === 'rating' && (
          <div className="space-y-1">
            <Label className="text-xs">Max Rating</Label>
            <Input type="number" min={2} max={10} value={maxRating} onChange={(e) => setMaxRating(e.target.value)} />
          </div>
        )}

        {type === 'dropdown' && (
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Options (comma-separated)</Label>
            <Input value={optionsStr} onChange={(e) => setOptionsStr(e.target.value)} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={!text.trim() || !category.trim()}>
          <Save className="size-4" />
          Save Changes
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public Link Section
// ---------------------------------------------------------------------------

function PublicLinkSection({
  template,
  onUpdate,
}: {
  template: EvalTemplate;
  onUpdate: (tmpl: EvalTemplate) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const submissions = storage.getPublicSubmissions().filter((s) => s.templateId === template.id);

  const publicUrl = template.publicLinkId
    ? `${window.location.origin}/public/eval/${template.publicLinkId}`
    : null;

  const handleGenerateLink = () => {
    const linkId = generatePublicLinkId();
    const updated = { ...template, publicLinkId: linkId, publicLinkActive: true };
    onUpdate(updated);
  };

  const handleToggleActive = () => {
    const updated = { ...template, publicLinkActive: !template.publicLinkActive };
    onUpdate(updated);
  };

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Separator />
      <div className="flex items-center gap-2">
        <Link2 className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Public Shareable Link</h3>
        {submissions.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {submissions.length} response{submissions.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {!template.publicLinkId ? (
        <div className="rounded-lg border border-dashed p-4 text-center">
          <Link2 className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Generate a public link to share this evaluation form with employees. They can fill it out without logging in.
          </p>
          <Button size="sm" className="mt-3" onClick={handleGenerateLink} disabled={template.questions.length === 0}>
            <Link2 className="size-4" />
            Generate Public Link
          </Button>
          {template.questions.length === 0 && (
            <p className="mt-2 text-xs text-amber-600 flex items-center justify-center gap-1">
              <AlertTriangle className="size-3" />
              Add at least one question first
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={`flex-1 rounded-md border px-3 py-2 text-sm font-mono ${template.publicLinkActive ? 'bg-muted' : 'bg-muted/50 line-through text-muted-foreground'}`}>
              {publicUrl}
            </div>
            <Button variant="outline" size="icon" onClick={handleCopy} title="Copy link">
              {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
            </Button>
            <Button variant="outline" size="icon" asChild title="Open in new tab">
              <a href={publicUrl!} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={template.publicLinkActive ? 'destructive' : 'default'}
              size="sm"
              onClick={handleToggleActive}
            >
              {template.publicLinkActive ? 'Deactivate Link' : 'Activate Link'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {template.publicLinkActive
                ? 'Link is active — employees can submit responses'
                : 'Link is deactivated — form cannot be submitted'}
            </span>
          </div>

          {/* Submissions viewer */}
          {submissions.length > 0 && (
            <div>
              <Button variant="outline" size="sm" onClick={() => setShowSubmissions(!showSubmissions)}>
                {showSubmissions ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                <Users className="size-4" />
                View Responses ({submissions.length})
              </Button>

              {showSubmissions && (
                <div className="mt-3 space-y-2">
                  {submissions
                    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                    .map((sub) => (
                      <SubmissionRow key={sub.id} submission={sub} template={template} />
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Submission Row (expandable)
// ---------------------------------------------------------------------------

function SubmissionRow({ submission, template }: { submission: PublicFormSubmission; template: EvalTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const scorePercent = submission.maxScore > 0 ? Math.round((submission.totalScore / submission.maxScore) * 100) : 0;

  return (
    <div className="rounded-md border">
      <button
        type="button"
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/30"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{submission.respondentName}</p>
          <p className="text-xs text-muted-foreground">{submission.respondentEmail}</p>
        </div>
        <Badge variant="secondary">{scorePercent}%</Badge>
        <span className="text-xs text-muted-foreground">
          {new Date(submission.submittedAt).toLocaleDateString()}
        </span>
      </button>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">Score:</span>
            <span className="font-semibold">{submission.totalScore} / {submission.maxScore} ({scorePercent}%)</span>
            {submission.respondentEmployeeId && (
              <>
                <span className="text-muted-foreground">Employee ID:</span>
                <span className="font-mono text-xs">{submission.respondentEmployeeId}</span>
              </>
            )}
          </div>
          <Separator />
          <div className="space-y-2">
            {template.questions.map((q) => {
              const answer = submission.answers.find((a) => a.questionId === q.id);
              return (
                <div key={q.id} className="grid gap-1 rounded-md bg-muted/30 p-2">
                  <p className="text-xs font-medium text-muted-foreground">{q.category}</p>
                  <p className="text-sm">{q.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium">
                      {answer
                        ? q.type === 'rating'
                          ? `${answer.value} / ${q.maxRating}`
                          : q.type === 'yes_no'
                          ? answer.value === true || answer.value === 'true' ? 'Yes' : 'No'
                          : String(answer.value)
                        : '—'}
                    </span>
                    {answer && q.type === 'rating' && (
                      <Badge variant="outline" className="text-xs">Score: {answer.score}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template Card
// ---------------------------------------------------------------------------

interface TemplateCardProps {
  template: EvalTemplate;
  onUpdate: (tmpl: EvalTemplate) => void;
  onDelete: (id: string) => void;
}

function TemplateCard({ template, onUpdate, onDelete }: TemplateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
  const [deleteTemplateOpen, setDeleteTemplateOpen] = useState(false);

  const existingCategories = [...new Set(template.questions.map((q) => q.category))];

  const addQuestion = useCallback(
    (q: EvalQuestion) => {
      const updated = { ...template, questions: [...template.questions, q] };
      onUpdate(updated);
      setShowAddForm(false);
    },
    [template, onUpdate]
  );

  const updateQuestion = useCallback(
    (q: EvalQuestion) => {
      const updated = {
        ...template,
        questions: template.questions.map((existing) => (existing.id === q.id ? q : existing)),
      };
      onUpdate(updated);
      setEditingQuestionId(null);
    },
    [template, onUpdate]
  );

  const deleteQuestion = useCallback(
    (qId: string) => {
      const updated = {
        ...template,
        questions: template.questions.filter((q) => q.id !== qId),
      };
      onUpdate(updated);
      setDeleteQuestionId(null);
    },
    [template, onUpdate]
  );

  const moveQuestion = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const qs = [...template.questions];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= qs.length) return;
      [qs[index], qs[target]] = [qs[target], qs[index]];
      onUpdate({ ...template, questions: qs });
    },
    [template, onUpdate]
  );

  const totalWeight = template.questions.reduce((sum, q) => sum + q.weight, 0);
  const categories = existingCategories;
  const submissionCount = storage.getPublicSubmissions().filter((s) => s.templateId === template.id).length;

  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          className="flex w-full items-center gap-3 text-left"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? (
            <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          )}
          <div className="flex-1">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1">
                <ClipboardList className="size-3" />
                {template.questions.length} question{template.questions.length !== 1 ? 's' : ''}
              </span>
              <span>Weight: {totalWeight}</span>
              <span>{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</span>
              {submissionCount > 0 && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <Users className="size-3" />
                  {submissionCount} response{submissionCount !== 1 ? 's' : ''}
                </span>
              )}
            </CardDescription>
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="capitalize">
            {template.type}
          </Badge>
          {template.publicLinkActive && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <Link2 className="size-3" />
              Public
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => { e.stopPropagation(); setDeleteTemplateOpen(true); }}
            className="text-destructive hover:text-destructive"
            title="Delete template"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          <Separator />

          {/* Question list */}
          <div className="space-y-2">
            {template.questions.length === 0 && !showAddForm && (
              <div className="flex flex-col items-center py-8 text-center">
                <ClipboardList className="size-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">No questions yet</p>
                <p className="text-xs text-muted-foreground">Add questions to build your evaluation form</p>
                <Button size="sm" className="mt-3" onClick={() => setShowAddForm(true)}>
                  <Plus className="size-4" />
                  Add First Question
                </Button>
              </div>
            )}

            {template.questions.map((q, idx) => {
              const Icon = getQuestionTypeIcon(q.type);

              if (editingQuestionId === q.id) {
                return (
                  <QuestionEditor
                    key={q.id}
                    question={q}
                    onSave={updateQuestion}
                    onCancel={() => setEditingQuestionId(null)}
                    existingCategories={existingCategories}
                  />
                );
              }

              return (
                <div
                  key={q.id}
                  className="group flex items-start gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/30"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                    {idx + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed font-medium">{q.text}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs gap-1 h-5">
                        <Icon className="size-3" />
                        {getQuestionTypeLabel(q.type)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs h-5">{q.category}</Badge>
                      <span>Weight: {q.weight}</span>
                      {q.type === 'rating' && q.maxRating && (
                        <span>Scale: 1-{q.maxRating}</span>
                      )}
                      {q.type === 'dropdown' && q.options && (
                        <span>{q.options.length} options</span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => moveQuestion(idx, 'up')}
                      disabled={idx === 0}
                      title="Move up"
                    >
                      <ArrowUp className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => moveQuestion(idx, 'down')}
                      disabled={idx === template.questions.length - 1}
                      title="Move down"
                    >
                      <ArrowDown className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setEditingQuestionId(q.id)}
                      title="Edit"
                    >
                      <PencilLine className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDeleteQuestionId(q.id)}
                      title="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add question form */}
          {showAddForm ? (
            <NewQuestionForm
              onAdd={addQuestion}
              onCancel={() => setShowAddForm(false)}
              existingCategories={existingCategories}
            />
          ) : template.questions.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="size-4" />
              Add Question
            </Button>
          ) : null}

          {/* Public link section */}
          <PublicLinkSection template={template} onUpdate={onUpdate} />

          {/* Delete question confirmation */}
          <AlertDialog
            open={!!deleteQuestionId}
            onOpenChange={(open) => !open && setDeleteQuestionId(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Question?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove this question from the template.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => deleteQuestionId && deleteQuestion(deleteQuestionId)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      )}

      {/* Delete template confirmation */}
      <AlertDialog open={deleteTemplateOpen} onOpenChange={setDeleteTemplateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{template.name}&quot; and all its questions. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => onDelete(template.id)}>
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// New Template Form
// ---------------------------------------------------------------------------

function NewTemplateForm({ onSave, onCancel }: { onSave: (t: EvalTemplate) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<EvalType>('annual');
  const [nameError, setNameError] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      setNameError('Template name is required');
      return;
    }
    const tmpl: EvalTemplate = {
      id: generateId('tmpl'),
      name: name.trim(),
      type,
      questions: [],
    };
    onSave(tmpl);
  };

  return (
    <Card className="border-2 border-primary/30">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-primary" />
          <p className="font-semibold text-lg">Create New Template</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tmpl-name">Template Name *</Label>
            <Input
              id="tmpl-name"
              placeholder="e.g., Annual Performance Review"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              className={nameError ? 'border-destructive' : ''}
              autoFocus
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tmpl-type">Evaluation Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as EvalType)}>
              <SelectTrigger id="tmpl-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="regularization">Regularization</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={!name.trim()}>
            <Save className="size-4" />
            Create Template
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Preview Modal
// ---------------------------------------------------------------------------

function PreviewModal({ template, open, onClose }: { template: EvalTemplate; open: boolean; onClose: () => void }) {
  const categories = [...new Set(template.questions.map((q) => q.category))];

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Eye className="size-5" />
            Form Preview — {template.name}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This is how the form will appear to respondents.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="text-sm font-semibold text-primary mb-3">{cat}</h3>
              <div className="space-y-3">
                {template.questions
                  .filter((q) => q.category === cat)
                  .map((q, idx) => (
                    <div key={q.id} className="rounded-md border p-3">
                      <p className="text-sm font-medium mb-2">{q.text}</p>
                      {q.type === 'rating' && (
                        <div className="flex gap-1">
                          {Array.from({ length: q.maxRating || 5 }, (_, i) => (
                            <div key={i} className="flex size-8 items-center justify-center rounded-md border text-xs text-muted-foreground">
                              {i + 1}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === 'text' && (
                        <div className="h-16 rounded-md border bg-muted/20" />
                      )}
                      {q.type === 'dropdown' && (
                        <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                          Select an option...
                        </div>
                      )}
                      {q.type === 'yes_no' && (
                        <div className="flex gap-2">
                          <div className="rounded-md border px-4 py-1.5 text-sm">Yes</div>
                          <div className="rounded-md border px-4 py-1.5 text-sm">No</div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function EvalTemplatesPage() {
  const [templates, setTemplates] = useState<EvalTemplate[]>(() => storage.getEvalTemplates());
  const [showNewForm, setShowNewForm] = useState(false);
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EvalTemplate | null>(null);

  const showSaved = useCallback(() => {
    setShowSaveFeedback(true);
    setTimeout(() => setShowSaveFeedback(false), 2000);
  }, []);

  const handleUpdateTemplate = useCallback((updated: EvalTemplate) => {
    // Write the full template object to storage to ensure questions array is saved properly
    const allTemplates = storage.getEvalTemplates();
    const idx = allTemplates.findIndex((t) => t.id === updated.id);
    if (idx !== -1) {
      allTemplates[idx] = updated;
      localStorage.setItem('hcm_eval_templates', JSON.stringify(allTemplates));
    }
    setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    showSaved();
  }, [showSaved]);

  const handleDeleteTemplate = useCallback((id: string) => {
    storage.removeEvalTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleCreateTemplate = useCallback((tmpl: EvalTemplate) => {
    storage.createEvalTemplate(tmpl);
    setTemplates((prev) => [...prev, tmpl]);
    setShowNewForm(false);
    showSaved();
  }, [showSaved]);

  return (
    <div className="space-y-6">
      <SaveFeedback show={showSaveFeedback} />

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <FileText className="size-6 text-primary" />
            Evaluation Templates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage evaluation forms. Generate public links to share with employees.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!showNewForm && (
            <Button onClick={() => setShowNewForm(true)}>
              <Plus className="size-4" />
              New Template
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Templates</p>
            <p className="text-2xl font-bold">{templates.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Total Questions</p>
            <p className="text-2xl font-bold">{templates.reduce((sum, t) => sum + t.questions.length, 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Active Links</p>
            <p className="text-2xl font-bold">{templates.filter((t) => t.publicLinkActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Total Responses</p>
            <p className="text-2xl font-bold">{storage.getPublicSubmissions().length}</p>
          </CardContent>
        </Card>
      </div>

      {/* New template form */}
      {showNewForm && (
        <NewTemplateForm onSave={handleCreateTemplate} onCancel={() => setShowNewForm(false)} />
      )}

      {/* Template list */}
      <div className="space-y-4">
        {templates.length === 0 && !showNewForm ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="size-12 text-muted-foreground/50" />
              <p className="mt-3 text-lg font-medium">No templates yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first evaluation template to get started.
              </p>
              <Button className="mt-4" onClick={() => setShowNewForm(true)}>
                <Plus className="size-4" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          templates.map((tmpl) => (
            <TemplateCard
              key={tmpl.id}
              template={tmpl}
              onUpdate={handleUpdateTemplate}
              onDelete={handleDeleteTemplate}
            />
          ))
        )}
      </div>

      {/* Preview modal */}
      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          open={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
}

export default EvalTemplatesPage;
