"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  KeyRound,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  Info,
} from "lucide-react";

function AccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/official";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = code.trim();
    if (!trimmed) {
      setError("Please enter the demo access code.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/official/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: trimmed }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Invalid access code.");
        }

        router.push(returnUrl);
        router.refresh();
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to authenticate. Please verify the demo code."
        );
      }
    });
  };

  return (
    <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Card Title & Icon */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center mx-auto shadow-2xs">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200">
          <span>Demo Access Gate</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Official Review — Demo Access
        </h1>

        <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
          Evaluation workspace for constituency issue prioritization, official human reviews, and development briefs.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Access Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="accessCode"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700"
          >
            Demo Access Code
          </label>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              id="accessCode"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter demo code"
              autoComplete="current-password"
              required
              className="w-full text-sm pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
            />
          </div>

          {/* Evaluator Hint */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Hackathon evaluator code:</span>
            <button
              type="button"
              onClick={() => setCode("loksanket2026")}
              className="font-mono font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 cursor-pointer"
              title="Click to fill evaluator code"
            >
              loksanket2026
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Verifying Code...</span>
            </>
          ) : (
            <>
              <span>Continue to Official Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Statutory Hackathon Disclaimer */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        <div className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            <strong>Demo Access Note:</strong> This is a hackathon evaluation access gate, not production identity verification. It does not verify government employee credentials.
          </span>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-slate-600 hover:text-indigo-700 transition-colors"
          >
            ← Return to Public Development Insights
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OfficialAccessPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-900 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/loksanket-logo-light.png"
              alt="LokSanket Logo"
              width={875}
              height={724}
              className="h-9 sm:h-10 w-auto object-contain"
              priority
            />
          </Link>

          <Link
            href="/dashboard"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Public Insights</span>
          </Link>
        </div>
      </header>

      {/* Main Card with Suspense */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <Suspense
          fallback={
            <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              Loading Official Access Gate...
            </div>
          }
        >
          <AccessForm />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        LokSanket · Constituency Development Intelligence Platform
      </footer>
    </div>
  );
}
