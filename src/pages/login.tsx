import { useState, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// ---------------------------------------------------------------------------
// Demo users for quick login
// ---------------------------------------------------------------------------

const DEMO_USERS = [
  { name: 'Sam', role: 'Admin', email: 'sam@opscorp.com', password: 'admin123', color: 'bg-white/80 text-slate-800 hover:bg-white' },
  { name: 'Maria', role: 'Supervisor', email: 'maria@opscorp.com', password: 'editor123', color: 'bg-white/80 text-slate-800 hover:bg-white' },
  { name: 'David', role: 'Finance', email: 'david@opscorp.com', password: 'finance123', color: 'bg-white/80 text-slate-800 hover:bg-white' },
  { name: 'John', role: 'Viewer', email: 'john@opscorp.com', password: 'viewer123', color: 'bg-white/80 text-slate-800 hover:bg-white' },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRedirectForRole(role: string): string {
  switch (role) {
    case 'admin':
    case 'editor':
      return '/dashboard';
    case 'viewer':
      return '/employees';
    default:
      return '/dashboard';
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type LoginState = 'idle' | 'loading' | 'success' | 'error';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginState, setLoginState] = useState<LoginState>('idle');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const emailError = emailTouched && email.length > 0 && !isValidEmail(email)
    ? 'Please enter a valid email address'
    : emailTouched && email.length === 0
      ? 'Email is required'
      : '';

  const passwordError = passwordTouched && password.length === 0
    ? 'Password is required'
    : '';

  const canSubmit = email.length > 0 && password.length > 0 && isValidEmail(email) && loginState === 'idle';

  const performLogin = useCallback(
    (loginEmail: string, loginPassword: string) => {
      setError('');
      setLoginState('loading');

      setTimeout(() => {
        const result = login(loginEmail, loginPassword);

        if (result.success) {
          setLoginState('success');
          const user = useAuthStore.getState().currentUser;
          const redirectTo = from ?? getRedirectForRole(user?.role ?? 'viewer');

          setTimeout(() => {
            navigate(redirectTo, { replace: true });
          }, 600);
        } else {
          setLoginState('error');
          if (result.error?.toLowerCase().includes('locked')) {
            setError('Your account has been locked. Contact your administrator.');
          } else {
            setError('Invalid email or password.');
          }
          setTimeout(() => {
            setLoginState('idle');
          }, 600);
        }
      }, 800);
    },
    [login, navigate, from],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!canSubmit) return;
    performLogin(email, password);
  };

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setEmailTouched(false);
    setPasswordTouched(false);
    performLogin(demoEmail, demoPassword);
  };

  const isLoading = loginState === 'loading';
  const isSuccess = loginState === 'success';
  const isError = loginState === 'error';

  return (
    <div
      className="relative flex min-h-screen items-center justify-center p-4"
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80)',
        }}
      />
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 w-full max-w-sm space-y-4">
        {/* Main Login Card */}
        <Card
          className={`transition-transform duration-300 shadow-2xl shadow-black/40 border-white/10 backdrop-blur-sm bg-background/95 ${isError ? 'animate-shake' : ''} ${isSuccess ? 'ring-2 ring-emerald-500/50' : ''}`}
        >
          <CardHeader className="items-center text-center pb-2">
            {/* CoDev Logo */}
            <div className="flex justify-center w-full mb-4">
              <img
                src="https://cdn.prod.website-files.com/686c5cf5daf49068c29a4269/699cffbca06267e8769324c6_codev-code%403x.avif"
                alt="CoDev"
                className="h-16 w-auto object-contain"
              />
            </div>
            <CardTitle className="text-lg leading-relaxed">
              {isSuccess ? (
                <span className="flex items-center justify-center gap-2 text-emerald-600">
                  <CheckCircle2 className="size-5 animate-in zoom-in-50 duration-300" />
                  Welcome!
                </span>
              ) : (
                  'Human Resource Management'
              )}
            </CardTitle>
            <CardDescription className="mt-3">
              {isSuccess ? 'Login successful. Redirecting...' : 'Sign in to your account'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  placeholder="you@example.com"
                  disabled={isLoading || isSuccess}
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

              {/* Password Field */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    placeholder="Enter password"
                    disabled={isLoading || isSuccess}
                    aria-invalid={!!passwordError}
                    autoComplete="current-password"
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-150">
                    {passwordError}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isSuccess}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in...
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="size-4" />
                    Success
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                <Link
                  to="/forgot-password"
                  className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  Forgot password?
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Demo Users Card */}
        <Card className="shadow-2xl shadow-black/40 border-white/10 backdrop-blur-sm bg-background/95">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-muted-foreground font-normal text-center">
              Demo Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.email}
                  type="button"
                  onClick={() => handleDemoLogin(user.email, user.password)}
                  disabled={isLoading || isSuccess}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2.5 text-sm transition-all hover:shadow-sm disabled:pointer-events-none disabled:opacity-50 ${user.color}`}
                >
                  <span className="font-medium">{user.name}</span>
                  <span className="text-[11px] opacity-70">{user.role}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;
