import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { isSupabaseConfigured } from "../lib/supabase";
import { validateLoginFields } from "../lib/validation";
import { useFormValidation } from "../hooks/useFormValidation";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import type { UserRole } from "../types";
import { APP_NAME } from "../lib/branding";

const dashboardPath: Record<UserRole, string> = {
  admin: "/admin",
  manager: "/manager",
  user: "/user",
};

export function LoginPage() {
  const navigate = useNavigate();
  const login = useStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { errors, clearField, clearAll, validate } = useFormValidation<
    "email" | "password"
  >();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    clearAll();

    if (!validate(() => validateLoginFields(email, password))) {
      return;
    }

    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    try {
      const result = await login(trimmedEmail, trimmedPassword);
      if (result.ok) {
        navigate(dashboardPath[result.role], { replace: true });
      } else {
        setError(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full flex-col bg-page pt-safe pb-safe">
      <div className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-cerulean">{APP_NAME}</h1>
          <p className="mt-2 text-mist">Sign in with your account</p>
        </div>

        <div className="rounded border border-morning bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-cerulean">Login</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearField("email");
              }}
              error={errors.email}
              placeholder="you@tsk.org"
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearField("password");
              }}
              error={errors.password}
              placeholder="Enter password"
            />

            {!isSupabaseConfigured() && (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Supabase keys are missing in this build. On Netlify, set{" "}
                <code className="text-cerulean">VITE_SUPABASE_URL</code> and{" "}
                <code className="text-cerulean">VITE_SUPABASE_ANON_KEY</code>, then redeploy.
              </p>
            )}

            {error && (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
