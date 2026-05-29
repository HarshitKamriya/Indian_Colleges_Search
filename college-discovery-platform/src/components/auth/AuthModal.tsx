"use client";

import { useState, useEffect } from "react";
import { useAuthModalStore } from "@/stores/useAuthModalStore";
import { signIn } from "next-auth/react";
import { X, Mail, Lock, User, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AuthModal() {
  const { isOpen, mode, close } = useAuthModalStore();
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Sync component state with store mode
  useEffect(() => {
    setAuthMode(mode);
    setError(null);
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }, [mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (authMode === "signup") {
        // Validation check
        if (!name.trim()) {
          setError("Name is required");
          setIsLoading(false);
          return;
        }
        if (password.length < 8) {
          setError("Password must be at least 8 characters");
          setIsLoading(false);
          return;
        }
        if (!/[A-Z]/.test(password)) {
          setError("Password must contain at least one uppercase letter");
          setIsLoading(false);
          return;
        }
        if (!/[0-9]/.test(password)) {
          setError("Password must contain at least one number");
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setIsLoading(false);
          return;
        }

        // Post to registration API
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || "Failed to register account");
          setIsLoading(false);
          return;
        }
      }

      // Sign in user
      const loginRes = await signIn("credentials", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (loginRes?.error) {
        setError(
          authMode === "signup"
            ? "Account created, but auto-login failed. Please sign in manually."
            : "Invalid email or password"
        );
        if (authMode === "signup") setAuthMode("login");
      } else {
        close();
        router.refresh();
        // Redirect back if query parameters callbackUrl exists
        const params = new URLSearchParams(window.location.search);
        const callbackUrl = params.get("callbackUrl");
        if (callbackUrl) {
          router.push(callbackUrl);
        }
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md overflow-hidden bg-white border rounded-2xl shadow-2xl border-slate-200/80 dark:bg-slate-900 dark:border-slate-800/80 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />

        <button
          onClick={close}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {authMode === "login" ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {authMode === "login"
                ? "Sign in to save colleges and comparisons"
                : "Join to get started discovering your ideal college"}
            </p>
          </div>

          {/* Tab buttons */}
          <div className="grid grid-cols-2 p-1 mb-6 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => {
                setAuthMode("login");
                setError(null);
              }}
              className={cn(
                "py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                authMode === "login"
                  ? "bg-white text-blue-600 shadow dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              Log In
            </button>
            <button
              onClick={() => {
                setAuthMode("signup");
                setError(null);
              }}
              className={cn(
                "py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                authMode === "signup"
                  ? "bg-white text-blue-600 shadow dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-3 mb-5 text-sm rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === "signup" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={authMode === "signup" ? "Min 8 chars, 1 uppercase, 1 number" : "••••••••"}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
            </div>

            {authMode === "signup" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 mt-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Please wait...
                </>
              ) : authMode === "login" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* OAuth Divider */}
          <div className="relative flex items-center justify-center my-6">
            <hr className="w-full border-slate-200 dark:border-slate-800" />
            <span className="absolute px-3 text-xs uppercase tracking-wider text-slate-400 bg-white dark:bg-slate-900">
              Or continue with
            </span>
          </div>

          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-sm font-semibold"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google Account
          </button>
        </div>
      </div>
    </div>
  );
}
