"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  ArrowLeft,
  Sparkles,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  XCircle,
  MapPin,
  ShieldCheck,
  ExternalLink,
  Info,
  Clock,
} from "lucide-react";

interface PriorityItem {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  wardIds: string[];
  priorityScore: number;
  priorityLevel: "High" | "Medium" | "Low";
  reportCount: number;
  localityCount: number;
  localities: string[];
  recentTrendPercent: number;
  photoCount: number;
  humanReview: {
    decision: "accept" | "adjust" | "reject" | null;
    adjustedPriorityLevel?: "high" | "medium" | "low";
    note?: string;
    reviewedAt?: string;
  } | null;
  summary: string;
  evidenceNarrative: string[];
  affectedAreas: string[];
  fieldVerification: string;
}

interface DevelopmentBriefData {
  generatedAt: string;
  evidence: {
    constituency: string;
    totalReports: number;
    totalClusters: number;
    reportsLast14Days: number;
  };
  brief: {
    executiveSummary: string;
    priorities: PriorityItem[];
    fieldVerificationSummary: Array<{
      priorityTitle: string;
      recommendation: string;
    }>;
    dataLimitations: string[];
  };
  provenance: {
    dataSource: string;
    isSynthetic: boolean;
    datasetLabel: string;
    decisionSupportNotice: string;
  };
}

interface DevelopmentBriefViewProps {
  mode: "public" | "official";
}

export default function DevelopmentBriefView({ mode }: DevelopmentBriefViewProps) {
  const isOfficial = mode === "official";

  const [briefData, setBriefData] = useState<DevelopmentBriefData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();

  const handleGenerateBrief = () => {
    if (!isOfficial) return;
    setError(null);

    startGenerating(async () => {
      try {
        const res = await fetch("/api/brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(
            data.error || "Failed to generate constituency development brief."
          );
        }

        setBriefData(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while generating the brief."
        );
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />

      {/* Official Mode Banner */}
      {isOfficial && (
        <aside aria-label="Official Review Session" className="bg-indigo-950 text-indigo-100 px-4 py-2 border-b border-indigo-900 text-xs">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                Official Review Mode (Demo)
              </span>
              <span className="text-indigo-400 hidden sm:inline">·</span>
              <span className="text-indigo-200 hidden sm:inline">
                Constituency Development Brief Generation
              </span>
            </div>
            <Link
              href="/official"
              className="text-indigo-200 hover:text-white text-xs font-semibold"
            >
              Back to Workspace →
            </Link>
          </div>
        </aside>
      )}

      {/* Top Breadcrumb Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs">
          <Link
            href={isOfficial ? "/official" : "/dashboard"}
            className="font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isOfficial ? "Back to Official Workspace" : "Back to Public Insights"}</span>
          </Link>
          <div className="flex items-center gap-2 text-slate-400">
            <span>Constituency Intelligence</span>
            <span>·</span>
            <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-200">
              Realistic Demonstration Data
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ========================================================================= */}
        {/* 1. DOCUMENT HEADER & GENERATE ACTION */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-100 pb-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Decision Support Brief
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Evidence-Backed Synthesis
                </span>
                {!isOfficial && (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    Public View
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Constituency Development Brief
              </h1>

              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                Evidence-backed summary generated from LokSanket&apos;s current priority signals. Grounded strictly in deterministic database metrics; Gemini synthesizes narrative without computing or altering statistics.
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-start sm:items-end gap-2">
              {isOfficial ? (
                <button
                  type="button"
                  onClick={handleGenerateBrief}
                  disabled={isGenerating}
                  className="px-5 py-2.5 rounded-md bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Synthesizing Brief...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{briefData ? "Regenerate Development Brief" : "Generate Development Brief"}</span>
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href="/official/access"
                  className="px-4 py-2 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Enter Official Review to Generate Brief</span>
                </Link>
              )}

              <span className="text-[11px] text-slate-400">
                {briefData
                  ? `Generated ${new Date(briefData.generatedAt).toLocaleTimeString("en-IN")}`
                  : isOfficial
                  ? "Pulls live data directly from MongoDB Atlas"
                  : "Official action restricted to official review mode"}
              </span>
            </div>
          </div>

          {/* Public Notice Banner */}
          {!isOfficial && !briefData && (
            <div className="p-4 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900 flex items-start gap-3">
              <Info className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Official Decision-Support Tool</p>
                <p className="text-indigo-800 leading-relaxed">
                  Generating official development briefs requires Official Demo Access. Evaluators can enter the official demo workspace to trigger Gemini synthesis over deterministic ground-truth evidence.
                </p>
                <div className="pt-1">
                  <Link
                    href="/official/access"
                    className="font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1"
                  >
                    <span>Open Official Demo Access →</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-3 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Unable to Generate Brief</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isGenerating && (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-700 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Gemini Ground-Truth Synthesis in Progress
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Aggregating complaint clusters, preserving deterministic scores, and structuring actionable recommendations for field verification...
                </p>
              </div>
            </div>
          )}

          {/* Empty State before first generation */}
          {!briefData && !isGenerating && !error && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  No Development Brief Generated Yet
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {isOfficial
                    ? "Click \"Generate Development Brief\" above to analyze current complaint clusters, calculate deterministic scores, and generate an evidence-backed narrative."
                    : "Development briefs are generated by officials in the Official Review workspace. Access the official review mode to generate a new brief."}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* BRIEF CONTENTS (WHEN GENERATED) */}
        {/* ========================================================================= */}
        {briefData && !isGenerating && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* 2. EXECUTIVE SUMMARY */}
            <section className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <Sparkles className="w-4 h-4" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  1. Executive Summary
                </h2>
              </div>
              <div className="bg-slate-50 p-5 rounded border border-slate-200 text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-line">
                {briefData.brief.executiveSummary}
              </div>
            </section>

            {/* 3. TOP PRIORITIES & SUPPORTING EVIDENCE */}
            <section className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-700" />
                    <span>2. Prioritized Constituency Issues ({briefData.brief.priorities.length})</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Issues ranked by deterministic priority score with underlying ground evidence
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Score = 5 Algorithmic Factors
                </span>
              </div>

              <div className="space-y-6">
                {briefData.brief.priorities.map((item, idx) => {
                  const detailHref = isOfficial
                    ? `/official/priorities/${item.id}`
                    : `/dashboard/priorities/${item.id}`;

                  return (
                    <article
                      key={item.id || idx}
                      className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6 space-y-4 hover:border-slate-300 transition-colors shadow-2xs"
                    >
                      {/* Priority Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              #{idx + 1}
                            </span>

                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                item.priorityLevel === "High"
                                  ? "bg-rose-50 text-rose-700 border-rose-300"
                                  : item.priorityLevel === "Medium"
                                  ? "bg-amber-50 text-amber-700 border-amber-300"
                                  : "bg-slate-100 text-slate-700 border-slate-300"
                              }`}
                            >
                              {item.priorityLevel} Priority
                            </span>

                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {item.category}
                            </span>

                            {item.humanReview && item.humanReview.decision ? (
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 ${
                                  item.humanReview.decision === "accept"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                    : item.humanReview.decision === "adjust"
                                    ? "bg-blue-50 text-blue-800 border-blue-300"
                                    : "bg-rose-50 text-rose-800 border-rose-300"
                                }`}
                              >
                                {item.humanReview.decision === "accept" && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                {item.humanReview.decision === "adjust" && <Sliders className="w-3 h-3 text-blue-600" />}
                                {item.humanReview.decision === "reject" && <XCircle className="w-3 h-3 text-rose-600" />}
                                Official: {item.humanReview.decision === "adjust"
                                  ? `ADJUSTED → ${item.humanReview.adjustedPriorityLevel?.toUpperCase()}`
                                  : item.humanReview.decision === "accept"
                                  ? "ACCEPTED"
                                  : "REJECTED"}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Official: PENDING
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-slate-900">
                            {item.title}
                          </h3>
                        </div>

                        {/* Deterministic Score */}
                        <div className="shrink-0 text-left sm:text-right bg-slate-50 px-3 py-2 rounded border border-slate-200">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Deterministic Score
                          </div>
                          <div className="text-xl font-black text-slate-900">
                            {item.priorityScore.toFixed(1)}
                            <span className="text-xs font-normal text-slate-500"> / 100.0</span>
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {item.summary}
                      </p>

                      {/* Supporting Evidence Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Citizen Reports
                          </span>
                          <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                            {item.reportCount} filings
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Affected Localities
                          </span>
                          <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                            {item.localityCount} distinct spots
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Recent Velocity
                          </span>
                          <span className={`text-sm font-bold mt-0.5 block ${item.recentTrendPercent > 0 ? "text-rose-700" : "text-slate-700"}`}>
                            {item.recentTrendPercent > 0 ? `+${item.recentTrendPercent}%` : `${item.recentTrendPercent}%`}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Photo Evidence
                          </span>
                          <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                            {item.photoCount} files on record
                          </span>
                        </div>
                      </div>

                      {/* Supporting Evidence Bullets */}
                      {item.evidenceNarrative && item.evidenceNarrative.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                            Supporting Ground Evidence
                          </span>
                          <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                            {item.evidenceNarrative.map((evText, evIdx) => (
                              <li key={evIdx} className="leading-relaxed">
                                {evText}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Affected Localities Badges */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                          Affected Areas
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.affectedAreas.map((loc, lIdx) => (
                            <span
                              key={lIdx}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200 flex items-center gap-1"
                            >
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {loc}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Field Verification Recommendation */}
                      {item.fieldVerification && (
                        <div className="p-3 bg-amber-50/60 rounded border border-amber-200 text-xs space-y-1">
                          <span className="font-bold text-amber-900 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Recommended Field Verification Spot
                          </span>
                          <p className="text-amber-900 leading-relaxed">
                            {item.fieldVerification}
                          </p>
                        </div>
                      )}

                      {/* Link to Detail Page */}
                      <div className="pt-2 flex justify-end">
                        <Link
                          href={detailHref}
                          className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                        >
                          <span>{isOfficial ? "Review in Official Detail Page" : "View Full Evidence Trail"}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* 4. RECOMMENDED AREAS FOR FIELD VERIFICATION */}
            <section className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-700" />
                  <span>3. Recommended Areas for Field Verification</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Suggested targets for municipal field inspection generated from deterministic evidence concentrations
                </p>
              </div>

              <div className="space-y-3">
                {briefData.brief.fieldVerificationSummary?.map((fv, fIdx) => (
                  <div
                    key={fIdx}
                    className="p-3.5 rounded bg-slate-50 border border-slate-200 text-xs space-y-1"
                  >
                    <span className="font-bold text-slate-900 block">
                      {fv.priorityTitle}
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      {fv.recommendation}
                    </p>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-slate-400 italic">
                Note: Field verification targets are advisory recommendations for departmental inspectors, not automated government orders.
              </div>
            </section>

            {/* 5. DATA LIMITATIONS */}
            <section className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>4. Data Limitations &amp; Caveats</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Important parameters regarding data completeness and coverage
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-700">
                {briefData.brief.dataLimitations.map((limitation, lIdx) => (
                  <li key={lIdx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{limitation}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 6. DATA PROVENANCE & STATUTORY FOOTER */}
            <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs text-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                <span>Data Provenance &amp; Decision-Support Statement</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Generated from LokSanket&apos;s stored complaint, cluster, and priority data. AI-generated narrative; verify against available evidence before municipal action.
              </p>
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                <span>Constituency: {briefData.evidence.constituency}</span>
                <span>·</span>
                <span>Data Source: {briefData.provenance.dataSource}</span>
                <span>·</span>
                <span>Classification: {briefData.provenance.datasetLabel}</span>
              </div>
            </section>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
