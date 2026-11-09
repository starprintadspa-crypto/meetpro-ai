import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Video } from "lucide-react";
import { ApiError, authApi } from "../services/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AuthPageProps {
  mode: "login" | "register";
}

export default function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Server validation ke alawa basic client-side validation (user ko jaldi feedback)
  const validate = (): string | null => {
    if (isRegister && name.trim().length < 2) return "Naam kam az kam 2 characters ka hona chahiye.";
    if (!EMAIL_PATTERN.test(email.trim())) return "Valid email address daalein.";
    if (password.length === 0) return "Password daalein.";
    if (isRegister && password.length < 8) return "Password kam az kam 8 characters ka hona chahiye.";
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      if (isRegister) {
        await authApi.register({ name: name.trim(), email: email.trim(), password });
      } else {
        await authApi.login({ email: email.trim(), password });
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Network error. Internet connection check karein.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-navy-800/20 px-3 py-2 text-navy-900 focus:border-brand-500 focus:outline-none";

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-brand-600">
          <Video className="h-7 w-7" aria-hidden="true" />
          <h1 className="text-2xl font-bold">MEETPRO AI</h1>
        </div>

        <h2 className="mb-4 text-center text-xl font-semibold text-navy-900">
          {isRegister ? "Account banayein" : "Sign in karein"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {isRegister && (
            <div>
              <label htmlFor="auth-name" className="mb-1 block text-sm font-medium text-navy-800">
                Naam
              </label>
              <input
                id="auth-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-navy-800">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-1 block text-sm font-medium text-navy-800">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-500 px-4 py-2.5 font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? "Please wait..." : isRegister ? "Account banayein" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-navy-700">
          {isRegister ? "Pehle se account hai? " : "Account nahi hai? "}
          <Link
            to={isRegister ? "/login" : "/register"}
            className="font-medium text-brand-600 hover:underline"
          >
            {isRegister ? "Sign in" : "Register karein"}
          </Link>
        </p>
      </div>
    </div>
  );
}
