import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type FormState = 'idle' | 'loading' | 'success';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [formState, setFormState] = useState<FormState>('idle');

  const emailError =
    emailTouched && email.length > 0 && !isValidEmail(email)
      ? 'Please enter a valid email address'
      : emailTouched && email.length === 0
        ? 'Email is required'
        : '';

  const canSubmit = email.length > 0 && isValidEmail(email) && formState === 'idle';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);

    if (!canSubmit) return;

    setFormState('loading');

    // Simulate network request
    setTimeout(() => {
      setFormState('success');
    }, 1200);
  };

  if (formState === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="size-6" />
            </div>
            <CardTitle className="text-xl">Check Your Email</CardTitle>
            <CardDescription>
              If an account exists for that email, a reset link has been sent. Please check your inbox and follow the instructions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-center text-xs text-muted-foreground">
              Did not receive an email? Check your spam folder or try again with a different address.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setEmail('');
                  setEmailTouched(false);
                  setFormState('idle');
                }}
              >
                Try another email
              </Button>
              <Button variant="ghost" className="w-full" asChild>
                <Link to="/login">
                  <ArrowLeft className="size-4" />
                  Back to login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mail className="size-6" />
          </div>
          <CardTitle className="text-xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email address and we will send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Email address</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder="you@example.com"
                disabled={formState === 'loading'}
                aria-invalid={!!emailError}
                autoComplete="email"
                autoFocus
              />
              {emailError && (
                <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-150">
                  {emailError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={formState === 'loading'}
            >
              {formState === 'loading' ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>

            <Button variant="ghost" className="w-full" asChild>
              <Link to="/login">
                <ArrowLeft className="size-4" />
                Back to login
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ForgotPasswordPage;
