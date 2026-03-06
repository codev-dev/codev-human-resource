import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { storage } from '@/lib/storage';
import type { ENPSInvite, ENPSSurvey, ENPSResponse, Employee } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Score Button Component
// ---------------------------------------------------------------------------

function ScoreButton({
  value,
  selected,
  onClick,
}: {
  value: number;
  selected: boolean;
  onClick: () => void;
}) {
  const getColorClasses = (score: number, isSelected: boolean) => {
    if (score <= 6) {
      return isSelected
        ? 'border-red-500 bg-red-500 text-white'
        : 'border-red-200 text-red-600 hover:border-red-400 hover:bg-red-50';
    }
    if (score <= 8) {
      return isSelected
        ? 'border-amber-500 bg-amber-500 text-white'
        : 'border-amber-200 text-amber-600 hover:border-amber-400 hover:bg-amber-50';
    }
    return isSelected
      ? 'border-emerald-500 bg-emerald-500 text-white'
      : 'border-emerald-200 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50';
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`Score ${value}`}
      className={cn(
        'flex size-10 sm:size-12 items-center justify-center rounded-lg border-2 text-sm font-semibold transition-all',
        getColorClasses(value, selected),
      )}
    >
      {value}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Public eNPS Form
// ---------------------------------------------------------------------------

export function PublicENPSFormPage() {
  const { linkId } = useParams<{ linkId: string }>();

  // Look up invite and survey
  const { invite, survey } = useMemo(() => {
    const foundInvite = storage.getENPSInvites().find(
      (inv: ENPSInvite) => inv.linkId === linkId,
    );
    let foundSurvey: ENPSSurvey | undefined;
    if (foundInvite) {
      foundSurvey = storage.getENPSSurvey(foundInvite.surveyId);
    }
    return { invite: foundInvite, survey: foundSurvey };
  }, [linkId]);

  // Form state
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scoreError, setScoreError] = useState('');

  // ---------------------------------------------------------------------------
  // Error states
  // ---------------------------------------------------------------------------

  // Invalid link
  if (!invite || !survey) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <XCircle className="size-16 text-destructive/50" />
            <h1 className="mt-4 text-xl font-semibold">Invalid Survey Link</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This survey link is invalid or has been removed. Please check the URL and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already answered
  if (invite.answered) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertCircle className="size-16 text-amber-500/50" />
            <h1 className="mt-4 text-xl font-semibold">Already Submitted</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You have already submitted your response for this survey. Thank you for your feedback.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Survey closed
  if (survey.status === 'closed') {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertCircle className="size-16 text-muted-foreground/50" />
            <h1 className="mt-4 text-xl font-semibold">Survey Closed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This survey has been closed and is no longer accepting responses.
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
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="size-10 text-emerald-600" />
            </div>
            <h1 className="mt-6 text-2xl font-semibold">Thank You!</h1>
            <p className="mt-2 text-muted-foreground">
              Your response has been recorded anonymously. We appreciate your honest feedback.
            </p>
            <p className="mt-6 text-xs text-muted-foreground">
              You can safely close this page now.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Submit handler
  // ---------------------------------------------------------------------------

  const handleSubmit = () => {
    if (selectedScore === null) {
      setScoreError('Please select a score to continue.');
      return;
    }

    setScoreError('');
    setIsSubmitting(true);

    setTimeout(() => {
      const employee = storage.getEmployees().find(
        (e: Employee) => e.email === invite.employeeEmail,
      );

      const response: ENPSResponse = {
        id: `enps-res-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        surveyId: invite.surveyId,
        score: selectedScore,
        comment: comment.trim() || undefined,
        department: employee?.department,
        unit: employee?.unit,
        submittedAt: new Date().toISOString(),
      };
      storage.createENPSResponse(response);

      storage.updateENPSInvite(invite.id, {
        answered: true,
        answeredAt: new Date().toISOString(),
      });

      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  // ---------------------------------------------------------------------------
  // Main form
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Branding Header */}
      <div className="border-b bg-background">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="flex items-center gap-3">
            <img
              src="https://cdn.prod.website-files.com/686c5cf5daf49068c29a4269/699cffbca06267e8769324c6_codev-code%403x.avif"
              alt="CoDev"
              className="h-8 w-auto"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* Survey title */}
        <div>
          <h1 className="text-2xl font-semibold">{survey.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your response is completely anonymous.
          </p>
        </div>

        {/* Score selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              On a scale of 0-10, how likely are you to recommend CoDev as a place to work?
            </CardTitle>
            <CardDescription>Select a score below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from({ length: 11 }, (_, i) => (
                <ScoreButton
                  key={i}
                  value={i}
                  selected={selectedScore === i}
                  onClick={() => {
                    setSelectedScore(i);
                    setScoreError('');
                  }}
                />
              ))}
            </div>

            {/* Labels */}
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>Not at all likely</span>
              <span>Extremely likely</span>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 pt-2 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-red-500" />
                Detractors (0-6)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-amber-500" />
                Passives (7-8)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-500" />
                Promoters (9-10)
              </span>
            </div>

            {scoreError && (
              <p className="text-sm text-destructive text-center">{scoreError}</p>
            )}
          </CardContent>
        </Card>

        {/* Comment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Any additional feedback? (Optional)</CardTitle>
            <CardDescription>
              Share any thoughts or suggestions you may have. This is completely anonymous.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="enps-comment" className="sr-only">
              Additional feedback
            </Label>
            <Textarea
              id="enps-comment"
              placeholder="Type your feedback here..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {selectedScore !== null
                  ? `Score selected: ${selectedScore}/10`
                  : 'Please select a score to submit'}
              </p>
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting || selectedScore === null}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Response'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground py-4">
          CoDev HRM &mdash; Employee Net Promoter Score Survey
        </p>
      </div>
    </div>
  );
}

export default PublicENPSFormPage;
