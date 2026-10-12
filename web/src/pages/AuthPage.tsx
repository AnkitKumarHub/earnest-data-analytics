import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/auth/auth-context";
import { getApiError } from "@/lib/api";
import { Backdrop } from "@/components/backdrop";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Label } from "@/components/ui/field";
import { Highlight } from "@/components/ui/highlight";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type AuthMode = "login" | "register";

export function AuthPage({ mode }: { mode: AuthMode }) {
  const isRegister = mode === "register";
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { from?: string } | null)?.from ?? "/tasks";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation: Record<string, string> = {};
    if (isRegister && !name.trim()) validation.name = "Name is required.";
    if (!email.trim()) validation.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) validation.email = "Enter a valid email address.";
    if (password.length < 8) validation.password = "Password must be at least 8 characters long.";
    if (Object.keys(validation).length) {
      setFieldErrors(validation);
      setMessage("");
      const first = Object.keys(validation)[0];
      document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    setMessage("");
    setFieldErrors({});
    try {
      if (isRegister) await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
      navigate(returnTo, { replace: true });
    } catch (error) {
      const apiError = getApiError(error);
      setMessage(apiError.message);
      setFieldErrors(apiError.fields);
    } finally {
      setSubmitting(false);
    }
  }

  function clearFieldError(field: string) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setMessage("");
  }

  return (
    <main className="relative isolate min-h-[100dvh] overflow-x-clip bg-background text-foreground">
      <Backdrop />
      <a className="skip-link" href="#auth-form">
        Skip to account form
      </a>

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-6 py-6 sm:px-12">
        <div className="flex items-center justify-between gap-4">
          <Link to="/login" className="font-onest text-lg font-semibold tracking-tight" aria-label="Daymark home">
            daymark
          </Link>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-muted-foreground sm:block">
              {isRegister ? "Already have an account?" : "New to Daymark?"}{" "}
              <Link
                to={isRegister ? "/login" : "/register"}
                className="font-medium text-foreground hover:text-brand"
              >
                {isRegister ? "Sign in" : "Create an account"}
              </Link>
            </p>
            <ThemeSwitcher />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
            {isRegister ? "Create your account" : "Sign in"}
          </h1>
          <p className="mt-3 text-base text-neutral-700 dark:text-neutral-400 md:text-lg">
            {isRegister ? (
              <>
                Start tracking work with a <Highlight>simple task list</Highlight>.
              </>
            ) : (
              <>
                Pick up where you left off on your <Highlight>personal tasks</Highlight>.
              </>
            )}
          </p>

          <form id="auth-form" className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            {message && <Alert tone="danger">{message}</Alert>}
            {isRegister && (
              <Field label="Your name" error={fieldErrors.name}>
                <Input
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    clearFieldError("name");
                  }}
                  placeholder="e.g. Aashi Sharma"
                />
              </Field>
            )}
            <Field label="Email address" error={fieldErrors.email}>
              <Input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={255}
                spellCheck={false}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearFieldError("email");
                }}
                placeholder="you@example.com"
              />
            </Field>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="password">Password</Label>
                {!isRegister && <span className="text-xs text-muted-foreground">At least 8 characters</span>}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearFieldError("password");
                  }}
                  placeholder="••••••••"
                  className="pr-11"
                  aria-invalid={Boolean(fieldErrors.password) || undefined}
                  aria-describedby={fieldErrors.password ? "password-error" : isRegister ? "password-hint" : undefined}
                />
                <IconButton
                  type="button"
                  variant="ghost"
                  className="absolute top-1/2 right-1 size-8 -translate-y-1/2"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </IconButton>
              </div>
              {isRegister && !fieldErrors.password && (
                <p id="password-hint" className="text-xs text-muted-foreground">
                  Use at least 8 characters.
                </p>
              )}
              {fieldErrors.password && (
                <p id="password-error" className="text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <Button type="submit" variant="solid" className="w-full" disabled={submitting} aria-busy={submitting || undefined}>
              {submitting ? (
                <>
                  <Spinner className="size-4" label={isRegister ? "Creating account" : "Signing in"} />
                  {isRegister ? "Creating account…" : "Signing in…"}
                </>
              ) : isRegister ? (
                "Create your account"
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground sm:hidden">
            {isRegister ? "Already have an account?" : "New to Daymark?"}{" "}
            <Link to={isRegister ? "/login" : "/register"} className="font-medium text-foreground hover:text-brand">
              {isRegister ? "Sign in" : "Create an account"}
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Your tasks belong to you. Your session stays private.
          </p>
        </div>
      </div>
    </main>
  );
}
