"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  ArrowLeft,
  AlertTriangle,
  Camera,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Users,
  Building,
  Clock,
  Sparkles,
  Sliders,
  XCircle,
  ShieldCheck,
  Edit3,
  Check,
  Info,
} from "lucide-react";

interface SeverityBreakdown {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

interface ClusterEvidence {
  reportCount: number;
  affectedLocalities: number;
  localities: string[];
  photoEvidenceCount: number;
  trendPercent: number;
  recentCount: number;
  previousCount: number;
  severityBreakdown: SeverityBreakdown;
  affectedGroups: string[];
  demandVolumeScore: number;
  severityScore: number;
  trendScore: number;
  geographicScore: number;
  evidenceScore: number;
  priorityScore: number;
}

interface ScoreBreakdownItem {
  factor: string;
  weightPercent: number;
  rawEvidence: string;
  normalizedScore: number;
  calculation: string;
  weightedContribution: number;
}

interface LocalityItem {
  locality: string;
  count: number;
  share: number;
}

export interface ReviewData {
  _id?: string;
  clusterId?: string;
  decision: "accept" | "adjust" | "reject";
  note?: string;
  adjustedPriorityLevel?: "high" | "medium" | "low";
  reviewedAt: string;
}

interface IssueClusterDetail {
  _id: string;
  title: string;
  category: string;
  subcategory: string;
  wardIds: string[];
  complaintIds: string[];
  reportCount: number;
  severityScore: number;
  trendScore: number;
  geographicScore: number;
  evidenceScore: number;
  priorityScore: number;
  priorityLevel: "High" | "Medium" | "Low";
  evidence: ClusterEvidence;
  aiExplanation?: string;
  officialDecision: string;
  review?: ReviewData;
  createdAt: string;
  updatedAt: string;
}

interface SampleComplaint {
  _id: string;
  rawText: string;
  location?: string;
  language: string;
  severity: string;
  imageUrl?: string;
  imageUrls?: string[];
  createdAt: string;
}

interface PriorityDetailViewProps {
  clusterId: string;
  mode: "public" | "official";
}

export default function PriorityDetailView({ clusterId, mode }: PriorityDetailViewProps) {
  const isOfficial = mode === "official";

  const [cluster, setCluster] = useState<IssueClusterDetail | null>(null);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdownItem[]>([]);
  const [localityBreakdown, setLocalityBreakdown] = useState<LocalityItem[]>([]);
  const [sampleComplaints, setSampleComplaints] = useState<SampleComplaint[]>([]);
  const [totalComplaintsCount, setTotalComplaintsCount] = useState<number>(0);
  const [complaintDisplayLimit, setComplaintDisplayLimit] = useState<number>(10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isGeneratingAi, startAiTransition] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);

  // Official Human Review State
  const [persistedReview, setPersistedReview] = useState<ReviewData | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<"accept" | "adjust" | "reject">("accept");
  const [adjustedLevel, setAdjustedLevel] = useState<"High" | "Medium" | "Low">("Medium");
  const [reviewNote, setReviewNote] = useState<string>("");
  const [isEditingReview, setIsEditingReview] = useState<boolean>(false);
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);
  const [isSubmittingReview, startSubmitReviewTransition] = useTransition();

  useEffect(() => {
    if (!clusterId) return;

    let ignore = false;

    async function loadCluster() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/priorities/${clusterId}`);
        const data = await res.json();
        if (ignore) return;
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load cluster details");
        }
        setCluster(data.cluster);
        setScoreBreakdown(data.scoreBreakdown || []);
        setLocalityBreakdown(data.localityBreakdown || []);
        setSampleComplaints(data.sampleComplaints || []);
        setTotalComplaintsCount(data.totalComplaintsCount || data.sampleComplaints?.length || 0);

        const existingRev: ReviewData | undefined = data.review || data.cluster?.review;
        if (existingRev && existingRev.decision) {
          setPersistedReview(existingRev);
          setSelectedDecision(existingRev.decision);
          if (existingRev.adjustedPriorityLevel) {
            const cap = (existingRev.adjustedPriorityLevel.charAt(0).toUpperCase() +
              existingRev.adjustedPriorityLevel.slice(1).toLowerCase()) as "High" | "Medium" | "Low";
            setAdjustedLevel(cap);
          }
          if (existingRev.note) {
            setReviewNote(existingRev.note);
          }
          setIsEditingReview(false);
        } else {
          setPersistedReview(null);
          setSelectedDecision("accept");
          setReviewNote("");
          setIsEditingReview(true);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Error loading priority cluster");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadCluster();

    return () => {
      ignore = true;
    };
  }, [clusterId]);

  const handleGenerateAiExplanation = () => {
    if (!clusterId) return;
    setAiError(null);
    startAiTransition(async () => {
      try {
        const res = await fetch(`/api/priorities/${clusterId}/explain`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to generate explanation");
        }
        setCluster((prev) =>
          prev ? { ...prev, aiExplanation: data.explanation } : prev
        );
      } catch (err: unknown) {
        setAiError(
          err instanceof Error
            ? err.message
            : "Automated decision-support interpretation temporarily unavailable."
        );
      }
    });
  };

  const handleReviewSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!clusterId || !isOfficial) return;

    setReviewSubmitError(null);
    setReviewSuccessMessage(null);

    startSubmitReviewTransition(async () => {
      try {
        const payload: {
          decision: "accept" | "adjust" | "reject";
          note?: string;
          adjustedPriorityLevel?: "high" | "medium" | "low";
        } = {
          decision: selectedDecision,
          note: reviewNote.trim() || undefined,
        };

        if (selectedDecision === "adjust") {
          payload.adjustedPriorityLevel = adjustedLevel.toLowerCase() as "high" | "medium" | "low";
        }

        const res = await fetch(`/api/priorities/${clusterId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to persist official review decision.");
        }

        setPersistedReview(data.review);
        setIsEditingReview(false);
        setReviewSuccessMessage("Official review decision recorded successfully.");

        if (data.cluster) {
          setCluster((prev) => (prev ? { ...prev, ...data.cluster } : prev));
        }
      } catch (err: unknown) {
        setReviewSubmitError(
          err instanceof Error
            ? err.message
            : "Error recording official review decision. Please try again."
        );
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
        <Navbar />
        <main className="flex-1 max-w-5xl mx-auto px-4 py-20 text-center">
          <div className="w-8 h-8 border-3 border-indigo-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-slate-700">
            Loading Priority Evidence Audit Trail...
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Retrieving deterministic score factors and underlying reports.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !cluster) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
        <Navbar />
        <main className="flex-1 max-w-5xl mx-auto px-4 py-16 text-center">
          <div className="inline-block p-6 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm max-w-md mx-auto space-y-3">
            <AlertTriangle className="w-6 h-6 mx-auto text-rose-600" />
            <p className="font-bold">Unable to load priority details</p>
            <p className="text-xs text-rose-700">{error || "Cluster not found"}</p>
            <Link
              href={isOfficial ? "/official" : "/dashboard"}
              className="inline-block px-4 py-1.5 bg-rose-700 text-white rounded text-xs font-semibold hover:bg-rose-800"
            >
              {isOfficial ? "Back to Official Dashboard" : "Back to Public Insights"}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const ev = cluster.evidence;

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
                You have review authority to Accept, Adjust, or Reject this priority.
              </span>
            </div>
            <Link
              href="/official"
              className="text-indigo-200 hover:text-white text-xs font-semibold"
            >
              Exit to Workspace →
            </Link>
          </div>
        </aside>
      )}

      {/* Breadcrumb Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs">
          <Link
            href={isOfficial ? "/official" : "/dashboard"}
            className="font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isOfficial ? "Back to Official Workspace" : "Back to Public Insights"}</span>
          </Link>
          <div className="flex items-center gap-2 text-slate-400">
            <span>Issue #{cluster._id.slice(-6)}</span>
            <span>·</span>
            <span className="text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded text-[10px] font-semibold border border-amber-200">
              Realistic Demonstration Data
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ========================================================================= */}
        {/* 1. DOCUMENT HEADER */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider border ${
                    cluster.priorityLevel === "High"
                      ? "bg-rose-50 text-rose-700 border-rose-300"
                      : cluster.priorityLevel === "Medium"
                      ? "bg-amber-50 text-amber-700 border-amber-300"
                      : "bg-slate-100 text-slate-700 border-slate-300"
                  }`}
                >
                  {cluster.priorityLevel} Priority
                </span>

                {persistedReview && persistedReview.decision ? (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider border flex items-center gap-1.5 ${
                      persistedReview.decision === "accept"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : persistedReview.decision === "adjust"
                        ? "bg-blue-50 text-blue-800 border-blue-300"
                        : "bg-rose-50 text-rose-800 border-rose-300"
                    }`}
                  >
                    {persistedReview.decision === "accept" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {persistedReview.decision === "adjust" && <Sliders className="w-3.5 h-3.5 text-blue-600" />}
                    {persistedReview.decision === "reject" && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                    Official: {persistedReview.decision === "adjust"
                      ? `ADJUSTED → ${persistedReview.adjustedPriorityLevel?.toUpperCase()}`
                      : persistedReview.decision === "accept"
                      ? "ACCEPTED"
                      : "REJECTED"}
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded font-semibold text-amber-800 bg-amber-50 border border-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Official: PENDING
                  </span>
                )}

                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {cluster.category}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {cluster.wardIds.join(", ")}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {cluster.title}
              </h1>

              <p className="text-xs text-slate-500">
                LokSanket identifies this as a <strong>{cluster.priorityLevel.toLowerCase()}-priority issue</strong> based on available civic evidence.
              </p>
            </div>

            {/* Priority Score Stamp */}
            <div className="text-left sm:text-right shrink-0 bg-slate-50 p-4 rounded border border-slate-200 min-w-[140px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Deterministic Score
              </div>
              <div className="text-3xl font-black text-slate-900 mt-0.5">
                {cluster.priorityScore.toFixed(1)}
              </div>
              <div className="text-[10px] text-slate-500">Out of 100.0</div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. OFFICIAL HUMAN REVIEW & GOVERNANCE STATUS */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-700" />
                <h2 className="text-base font-bold uppercase tracking-wider text-slate-900">
                  Official Human Review &amp; Governance Status
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                LokSanket is decision support, not an autonomous government decision-maker. All AI recommendations are subject to official human review.
              </p>
            </div>
            <span className="text-[11px] font-mono font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 self-start sm:self-auto">
              AI Recommendation → Human Review → Decision
            </span>
          </div>

          {/* Side-by-Side: Current AI Recommendation vs Official Human Decision */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card A: Current AI Recommendation */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Current AI Recommendation
                </span>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${
                    cluster.priorityLevel === "High"
                      ? "bg-rose-50 text-rose-700 border-rose-300"
                      : cluster.priorityLevel === "Medium"
                      ? "bg-amber-50 text-amber-700 border-amber-300"
                      : "bg-slate-100 text-slate-700 border-slate-300"
                  }`}
                >
                  {cluster.priorityLevel} Priority
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {cluster.priorityScore.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500 font-medium">/ 100.0 Score</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                LokSanket identifies this as a <strong>{cluster.priorityLevel.toLowerCase()}-priority issue</strong> based on the available evidence ({cluster.reportCount} citizen reports across {cluster.evidence?.affectedLocalities || 1} localities).
              </p>

              <div className="text-[11px] text-slate-400 border-t border-slate-200/60 pt-2">
                AI decision-support advisory. Ground evidence trail detailed below.
              </div>
            </div>

            {/* Card B: Human Review State */}
            <div
              className={`rounded-lg border p-5 space-y-3 ${
                persistedReview?.decision === "accept"
                  ? "border-emerald-200 bg-emerald-50/40"
                  : persistedReview?.decision === "adjust"
                  ? "border-blue-200 bg-blue-50/40"
                  : persistedReview?.decision === "reject"
                  ? "border-rose-200 bg-rose-50/40"
                  : "border-amber-200 bg-amber-50/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Official Human Decision
                </span>
                {persistedReview && persistedReview.decision ? (
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border flex items-center gap-1.5 ${
                      persistedReview.decision === "accept"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : persistedReview.decision === "adjust"
                        ? "bg-blue-100 text-blue-800 border-blue-300"
                        : "bg-rose-100 text-rose-800 border-rose-300"
                    }`}
                  >
                    {persistedReview.decision === "accept" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                    {persistedReview.decision === "adjust" && <Sliders className="w-3.5 h-3.5 text-blue-700" />}
                    {persistedReview.decision === "reject" && <XCircle className="w-3.5 h-3.5 text-rose-700" />}
                    {persistedReview.decision === "adjust"
                      ? `ADJUSTED → ${persistedReview.adjustedPriorityLevel?.toUpperCase()}`
                      : persistedReview.decision === "accept"
                      ? "ACCEPTED"
                      : "REJECTED"}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    PENDING
                  </span>
                )}
              </div>

              {persistedReview && persistedReview.decision ? (
                <div className="space-y-2.5">
                  <div className="text-xs text-slate-700 leading-relaxed">
                    {persistedReview.decision === "accept" && (
                      <span>
                        AI recommendation of <strong>{cluster.priorityLevel} Priority</strong> was officially accepted and confirmed for municipal response.
                      </span>
                    )}
                    {persistedReview.decision === "adjust" && (
                      <span>
                        Operational priority adjusted from {cluster.priorityLevel} to <strong className="capitalize">{persistedReview.adjustedPriorityLevel} Priority</strong>. Original deterministic AI score ({cluster.priorityScore.toFixed(1)}) remains unchanged.
                      </span>
                    )}
                    {persistedReview.decision === "reject" && (
                      <span>
                        Recommendation was officially reviewed and rejected by municipal authority.
                      </span>
                    )}
                  </div>

                  {persistedReview.note && (
                    <div className="bg-white/90 rounded border border-slate-200/90 p-3 text-xs text-slate-800 italic shadow-2xs">
                      &ldquo;{persistedReview.note}&rdquo;
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>
                      Reviewed on {new Date(persistedReview.reviewedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </span>

                    {/* Official mode can toggle modification */}
                    {isOfficial && (
                      <button
                        type="button"
                        onClick={() => setIsEditingReview((prev) => !prev)}
                        className="text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        {isEditingReview ? "Close Form" : "Modify Decision"}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isOfficial
                      ? "No official review decision has been recorded yet. Please inspect the civic evidence trail and select Accept, Adjust, or Reject below."
                      : "Official review is handled through the Official Review workflow."}
                  </p>
                  <div className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                    <span>⚡ Official review pending for this priority</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Banners (Official Mode) */}
          {reviewSuccessMessage && (
            <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{reviewSuccessMessage}</span>
            </div>
          )}

          {reviewSubmitError && (
            <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{reviewSubmitError}</span>
            </div>
          )}

          {/* Public Read-Only Disclaimer Note */}
          {!isOfficial && (
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>Official review is handled through the Official Review workflow.</span>
              </div>
              <Link
                href="/official/access"
                className="font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Official Access (Demo) →</span>
              </Link>
            </div>
          )}

          {/* Interactive Review Action Form (OFFICIAL MODE ONLY) */}
          {isOfficial && (!persistedReview || !persistedReview.decision || isEditingReview) && (
            <form onSubmit={handleReviewSubmit} className="border-t border-slate-100 pt-5 space-y-5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                    {persistedReview && persistedReview.decision ? "Update Official Review Action" : "Select Official Review Action"}
                  </label>
                  <span className="text-[11px] text-slate-500">Choose one of three actions</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Action 1: Accept */}
                  <button
                    type="button"
                    onClick={() => setSelectedDecision("accept")}
                    className={`p-4 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      selectedDecision === "accept"
                        ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className={`w-4 h-4 ${selectedDecision === "accept" ? "text-emerald-600" : "text-slate-400"}`} />
                        Accept
                      </span>
                      {selectedDecision === "accept" && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Endorse AI recommendation as <strong>{cluster.priorityLevel} Priority</strong> for departmental action.
                    </p>
                  </button>

                  {/* Action 2: Adjust */}
                  <button
                    type="button"
                    onClick={() => setSelectedDecision("adjust")}
                    className={`p-4 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      selectedDecision === "adjust"
                        ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <Sliders className={`w-4 h-4 ${selectedDecision === "adjust" ? "text-blue-600" : "text-slate-400"}`} />
                        Adjust
                      </span>
                      {selectedDecision === "adjust" && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Modify operational priority while preserving original deterministic score ({cluster.priorityScore.toFixed(1)}).
                    </p>
                  </button>

                  {/* Action 3: Reject */}
                  <button
                    type="button"
                    onClick={() => setSelectedDecision("reject")}
                    className={`p-4 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      selectedDecision === "reject"
                        ? "border-rose-600 bg-rose-50/70 ring-2 ring-rose-500/20 shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <XCircle className={`w-4 h-4 ${selectedDecision === "reject" ? "text-rose-600" : "text-slate-400"}`} />
                        Reject / Defer
                      </span>
                      {selectedDecision === "reject" && (
                        <span className="w-2 h-2 rounded-full bg-rose-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Decline prioritization or defer action pending further ground validation.
                    </p>
                  </button>
                </div>
              </div>

              {/* Adjust Priority Level Picker */}
              {selectedDecision === "adjust" && (
                <div className="bg-blue-50/60 rounded-lg p-4 border border-blue-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Select Adjusted Priority Level
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Original AI Recommendation: <strong>{cluster.priorityLevel}</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {(["High", "Medium", "Low"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setAdjustedLevel(level)}
                        className={`px-4 py-2 rounded-md font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border ${
                          adjustedLevel === level
                            ? level === "High"
                              ? "bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-500/20"
                              : level === "Medium"
                              ? "bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-500/20"
                              : "bg-slate-700 text-white border-slate-800 shadow-xs ring-2 ring-slate-500/20"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        {level} Priority
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-blue-900/80 leading-relaxed">
                    <strong>Rule:</strong> The underlying deterministic priority score of <strong>{cluster.priorityScore.toFixed(1)}</strong> remains completely intact. The adjustment reflects the official administrative decision.
                  </p>
                </div>
              )}

              {/* Optional Reviewer Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Official Reviewer Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Add justification, field observations, or specific departmental directives (e.g. 'Site inspected by junior engineer; emergency patch approved')..."
                  className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-y"
                  maxLength={2000}
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Persisted with timestamp in official municipal registry</span>
                  <span>{reviewNote.length}/2000 characters</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-5 py-2.5 rounded-md bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  {isSubmittingReview ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Recording Decision...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{persistedReview ? "Update Official Decision" : "Save Official Decision"}</span>
                    </>
                  )}
                </button>

                {persistedReview && (
                  <button
                    type="button"
                    onClick={() => setIsEditingReview(false)}
                    disabled={isSubmittingReview}
                    className="px-4 py-2.5 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 3. FIVE-FACTOR DETERMINISTIC SCORE BREAKDOWN */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Deterministic Priority Calculation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                The score of <strong>{cluster.priorityScore.toFixed(1)}</strong> is calculated strictly from these five transparent components.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 self-start sm:self-auto">
              Total Score = &Sigma; Weighted Contributions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <th className="py-2.5 px-3">Factor</th>
                  <th className="py-2.5 px-3 text-center">Weight</th>
                  <th className="py-2.5 px-3">Raw Evidence</th>
                  <th className="py-2.5 px-3 text-right">Normalized (0-10)</th>
                  <th className="py-2.5 px-3 text-right font-bold text-slate-900">
                    Weighted Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scoreBreakdown.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {item.factor}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500">
                      {item.weightPercent}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {item.rawEvidence}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {item.normalizedScore.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                      +{item.weightedContribution.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-bold">
                  <td className="py-2.5 px-3 text-slate-900">Final Deterministic Score</td>
                  <td className="py-2.5 px-3 text-center text-slate-500">100%</td>
                  <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                    Mathematically verified
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                  <td className="py-2.5 px-3 text-right font-black text-slate-900 text-sm">
                    {cluster.priorityScore.toFixed(1)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Severity Breakdown Bar */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-slate-600">
                Underlying Severity Distribution
              </span>
              <span>
                Critical: {ev?.severityBreakdown?.critical ?? 0} · High:{" "}
                {ev?.severityBreakdown?.high ?? 0} · Medium:{" "}
                {ev?.severityBreakdown?.medium ?? 0} · Low:{" "}
                {ev?.severityBreakdown?.low ?? 0}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                style={{
                  width: `${
                    ((ev?.severityBreakdown?.critical ?? 0) /
                      (cluster.reportCount || 1)) *
                    100
                  }%`,
                }}
                className="bg-rose-700 h-full"
                title={`Critical: ${ev?.severityBreakdown?.critical ?? 0}`}
              />
              <div
                style={{
                  width: `${
                    ((ev?.severityBreakdown?.high ?? 0) /
                      (cluster.reportCount || 1)) *
                    100
                  }%`,
                }}
                className="bg-amber-600 h-full"
                title={`High: ${ev?.severityBreakdown?.high ?? 0}`}
              />
              <div
                style={{
                  width: `${
                    ((ev?.severityBreakdown?.medium ?? 0) /
                      (cluster.reportCount || 1)) *
                    100
                  }%`,
                }}
                className="bg-blue-500 h-full"
                title={`Medium: ${ev?.severityBreakdown?.medium ?? 0}`}
              />
              <div
                style={{
                  width: `${
                    ((ev?.severityBreakdown?.low ?? 0) /
                      (cluster.reportCount || 1)) *
                    100
                  }%`,
                }}
                className="bg-slate-400 h-full"
                title={`Low: ${ev?.severityBreakdown?.low ?? 0}`}
              />
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. GEMINI DECISION-SUPPORT EXPLANATION */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-700" />
                <span>Decision-Support Interpretation</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated natural-language summary grounded strictly in the verified metrics above
              </p>
            </div>

            <button
              onClick={handleGenerateAiExplanation}
              disabled={isGeneratingAi}
              className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isGeneratingAi ? "animate-spin" : ""}`}
              />
              <span>{cluster.aiExplanation ? "Regenerate Interpretation" : "Generate Interpretation"}</span>
            </button>
          </div>

          {aiError && (
            <div className="p-3 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {aiError}
            </div>
          )}

          {isGeneratingAi ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                Synthesizing verified statistics into decision-support brief...
              </p>
            </div>
          ) : cluster.aiExplanation ? (
            <div className="bg-slate-50 p-5 rounded border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-normal">
              {cluster.aiExplanation}
            </div>
          ) : (
            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-slate-500">
                No automated interpretation generated yet. Click &ldquo;Generate Interpretation&rdquo; to review the decision-support brief.
              </p>
            </div>
          )}

          <div className="text-[11px] text-slate-400 italic">
            Notice: LokSanket uses Gemini strictly to explain verified application statistics. The platform does not allow AI to compute statistics or make government decisions.
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. AFFECTED LOCALITIES & UNDERLYING CITIZEN COMPLAINTS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Affected Localities Column */}
          <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center justify-between">
              <span>Affected Localities ({localityBreakdown.length})</span>
              <Building className="w-4 h-4 text-slate-400" />
            </h3>
            <p className="text-[11px] text-slate-500">
              Specific street spots and junctions reporting this recurring grievance
            </p>

            <div className="space-y-2 text-xs text-slate-700 pt-1">
              {localityBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-slate-800 leading-tight">
                      {item.locality}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 shrink-0">
                    {item.count} reports ({item.share}%)
                  </span>
                </div>
              ))}
            </div>

            {/* Impacted Groups */}
            {ev?.affectedGroups?.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Impacted Groups
                </span>
                <div className="flex flex-wrap gap-1">
                  {ev.affectedGroups.map((g, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Traceable Ground-Truth Citizen Complaints */}
          <section className="md:col-span-2 bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Traceable Citizen Reports ({totalComplaintsCount} total)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Authentic citizen filings in Hindi, English, and Hinglish mapped to this issue
                </p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Showing {Math.min(complaintDisplayLimit, sampleComplaints.length)} of {totalComplaintsCount}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[30rem] overflow-y-auto pr-1">
              {sampleComplaints.slice(0, complaintDisplayLimit).map((c) => (
                <div
                  key={c._id}
                  className="p-3 rounded bg-slate-50 border border-slate-200/80 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-800">
                      {c.location || "Locality unspecified"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                          c.severity === "critical"
                            ? "bg-rose-100 text-rose-800"
                            : c.severity === "high"
                            ? "bg-amber-100 text-amber-800"
                            : c.severity === "medium"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {c.severity}
                      </span>
                      <span className="uppercase text-[10px] font-medium text-slate-500">
                        {c.language} · {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-800 italic leading-relaxed">&ldquo;{c.rawText}&rdquo;</p>

                  {(() => {
                    const photos =
                      Array.isArray(c.imageUrls) && c.imageUrls.length > 0
                        ? c.imageUrls
                        : c.imageUrl
                        ? [c.imageUrl]
                        : [];

                    if (photos.length === 0) return null;

                    return (
                      <div className="pt-1.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-700">
                          <Camera className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>
                            {photos.length === 1
                              ? `Photo evidence on file: ${photos[0].split("/").pop()}`
                              : `${photos.length} photos on file`}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-0.5">
                          {photos.map((photoUrl, pIdx) => {
                            const fileName =
                              photoUrl.split("/").pop() || `Photo ${pIdx + 1}`;
                            return (
                              <a
                                key={pIdx}
                                href={photoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group inline-flex items-center gap-1.5 p-1 pr-2 rounded-md border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-300 transition-colors shadow-2xs"
                                title={`Open ${fileName}`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photoUrl}
                                  alt={fileName}
                                  className="w-8 h-8 object-cover rounded border border-slate-200"
                                  loading="lazy"
                                />
                                <span className="text-[10px] text-slate-700 font-medium max-w-[100px] sm:max-w-[140px] truncate">
                                  {fileName}
                                </span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>

            {/* Pagination / Expand Control */}
            {sampleComplaints.length > complaintDisplayLimit && (
              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setComplaintDisplayLimit((prev) => prev + 10)}
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-800 cursor-pointer"
                >
                  Load More Reports ({sampleComplaints.length - complaintDisplayLimit} remaining) ↓
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
