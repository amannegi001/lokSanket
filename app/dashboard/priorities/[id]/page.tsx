"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
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
  TrendingUp,
  Clock,
  Sparkles,
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

interface TemporalComparison {
  recent14d: number;
  previous14d: number;
  olderThan28d: number;
  trendPercent: number;
  isIncreasing: boolean;
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
  createdAt: string;
}

export default function PriorityDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [cluster, setCluster] = useState<IssueClusterDetail | null>(null);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdownItem[]>([]);
  const [localityBreakdown, setLocalityBreakdown] = useState<LocalityItem[]>([]);
  const [temporalComparison, setTemporalComparison] = useState<TemporalComparison | null>(null);
  const [sampleComplaints, setSampleComplaints] = useState<SampleComplaint[]>([]);
  const [totalComplaintsCount, setTotalComplaintsCount] = useState<number>(0);
  const [complaintDisplayLimit, setComplaintDisplayLimit] = useState<number>(10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isGeneratingAi, startAiTransition] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);

  const [isUpdatingReview, startReviewTransition] = useTransition();
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let ignore = false;

    async function loadCluster() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/priorities/${id}`);
        const data = await res.json();
        if (ignore) return;
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load cluster details");
        }
        setCluster(data.cluster);
        setScoreBreakdown(data.scoreBreakdown || []);
        setLocalityBreakdown(data.localityBreakdown || []);
        setTemporalComparison(data.temporalComparison || null);
        setSampleComplaints(data.sampleComplaints || []);
        setTotalComplaintsCount(data.totalComplaintsCount || data.sampleComplaints?.length || 0);
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
  }, [id]);

  const handleGenerateAiExplanation = () => {
    if (!id) return;
    setAiError(null);
    startAiTransition(async () => {
      try {
        const res = await fetch(`/api/priorities/${id}/explain`, {
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

  const handleUpdateDecision = (newDecision: string) => {
    if (!id) return;
    startReviewTransition(async () => {
      try {
        const res = await fetch(`/api/priorities/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ officialDecision: newDecision }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to update review decision");
        }
        setCluster((prev) =>
          prev ? { ...prev, officialDecision: newDecision } : prev
        );
        setReviewMessage(`Review status updated to: ${newDecision.replace(/_/g, " ")}`);
        setTimeout(() => setReviewMessage(null), 3500);
      } catch (err: unknown) {
        setReviewMessage(err instanceof Error ? err.message : "Update failed");
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-7xl mx-auto px-4 py-24 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-sm font-semibold text-slate-800">
            Loading Issue Evidence Brief...
          </h2>
          <p className="text-xs text-slate-500">
            Fetching verified ground truth from MongoDB Atlas.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !cluster) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-xl mx-auto px-4 py-20 text-center space-y-4">
          <AlertTriangle className="w-8 h-8 mx-auto text-rose-600" />
          <h2 className="text-lg font-bold text-slate-900">Issue Record Not Found</h2>
          <p className="text-sm text-slate-500">{error || "Cluster ID is invalid."}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const ev = cluster.evidence;
  const highCriticalReports = (ev?.severityBreakdown?.critical ?? 0) + (ev?.severityBreakdown?.high ?? 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />

      {/* Breadcrumb Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs">
          <Link
            href="/dashboard"
            className="font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
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
                LokSanket identified this as a <strong>{cluster.priorityLevel.toLowerCase()} priority issue</strong> based on available civic evidence.
              </p>
            </div>

            {/* Priority Score Stamp */}
            <div className="text-left sm:text-right shrink-0 bg-slate-50 p-4 rounded border border-slate-200 min-w-[140px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Priority Score
              </div>
              <div className="text-3xl font-black text-slate-900 mt-0.5">
                {cluster.priorityScore.toFixed(1)}
              </div>
              <div className="text-[10px] text-slate-500">Out of 100.0</div>
            </div>
          </div>

          {/* Official Review Status Indicator */}
          <div className="bg-slate-50 rounded p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                Official Decision Status:
              </span>
              <span
                className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[11px] border ${
                  cluster.officialDecision === "approved_for_action"
                    ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                    : cluster.officialDecision === "deferred" ||
                      cluster.officialDecision === "rejected"
                    ? "bg-rose-100 text-rose-900 border-rose-300"
                    : "bg-amber-100 text-amber-900 border-amber-300"
                }`}
              >
                {cluster.officialDecision ? cluster.officialDecision.replace(/_/g, " ") : "pending review"}
              </span>
              {reviewMessage && (
                <span className="text-emerald-700 font-medium">✓ {reviewMessage}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleUpdateDecision("approved_for_action")}
                disabled={isUpdatingReview}
                className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Approve for Action
              </button>
              <button
                onClick={() => handleUpdateDecision("in_progress")}
                disabled={isUpdatingReview}
                className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                In Progress
              </button>
              <button
                onClick={() => handleUpdateDecision("deferred")}
                disabled={isUpdatingReview}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Defer
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. FIVE-FACTOR DETERMINISTIC SCORE BREAKDOWN */}
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
            <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200">
              Formula: 30% Demand + 25% Severity + 20% Trend + 15% Geo + 10% Evidence
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] bg-slate-50/70">
                  <th className="py-2.5 px-3">Factor</th>
                  <th className="py-2.5 px-3">Ground Evidence</th>
                  <th className="py-2.5 px-3 text-right">Norm Score (0–100)</th>
                  <th className="py-2.5 px-3 text-right">Weight</th>
                  <th className="py-2.5 px-3 text-right">Calculation</th>
                  <th className="py-2.5 px-3 text-right">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {scoreBreakdown.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      {item.factor}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                      {item.rawEvidence}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                      {item.normalizedScore}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                      {item.weightPercent}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400 text-[11px]">
                      {item.calculation}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      +{item.weightedContribution.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                  <td colSpan={4} className="py-3 px-3 text-slate-900">
                    Final Computed Priority Score
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 font-mono text-xs">
                    Sum
                  </td>
                  <td className="py-3 px-3 text-right text-slate-900 font-black text-sm">
                    {cluster.priorityScore.toFixed(1)} / 100
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. EVIDENCE SECTION & TEMPORAL COMPARISON */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verified Ground Evidence</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Constituency intake telemetry recorded in MongoDB
              </p>
            </div>
            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {ev?.reportCount ?? cluster.reportCount} total records
            </span>
          </div>

          {/* 5-Card Metric Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3.5 bg-slate-50 rounded border border-slate-200">
              <div className="text-2xl font-black text-slate-900">
                {ev?.reportCount ?? cluster.reportCount}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                Related Reports
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded border border-slate-200">
              <div className="text-2xl font-black text-slate-900">
                {ev?.affectedLocalities ?? localityBreakdown.length}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                Affected Localities
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded border border-slate-200">
              <div className="text-2xl font-black text-blue-600">
                {ev?.photoEvidenceCount ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                Photo Evidences
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded border border-slate-200">
              <div className="text-2xl font-black text-rose-600">
                {(ev?.trendPercent ?? 0) > 0
                  ? `+${ev?.trendPercent}%`
                  : `${ev?.trendPercent}%`}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                14-Day Growth
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded border border-slate-200 col-span-2 sm:col-span-1">
              <div className="text-2xl font-black text-slate-900">
                {highCriticalReports}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                High / Critical Reports
              </div>
            </div>
          </div>

          {/* Temporal Comparison Banner */}
          {temporalComparison && (
            <div className="p-4 rounded bg-indigo-50/50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-700 shrink-0" />
                <span className="font-bold text-slate-800">
                  Temporal Dynamics:
                </span>
                <span className="text-slate-600">
                  <strong>{temporalComparison.recent14d}</strong> recent (0–14d) vs{" "}
                  <strong>{temporalComparison.previous14d}</strong> previous (15–28d)
                  {temporalComparison.olderThan28d > 0 && (
                    <span>, {temporalComparison.olderThan28d} older baseline</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-indigo-900 shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  {temporalComparison.isIncreasing ? "Surging Velocity" : "Trend Velocity"}:{" "}
                  {temporalComparison.trendPercent > 0
                    ? `+${temporalComparison.trendPercent}%`
                    : `${temporalComparison.trendPercent}%`}
                </span>
              </div>
            </div>
          )}

          {/* Severity Breakdown Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold text-slate-700">
                Severity Distribution Breakdown:
              </span>
              <span>
                Critical: {ev?.severityBreakdown?.critical ?? 0} · High: {ev?.severityBreakdown?.high ?? 0} · Medium: {ev?.severityBreakdown?.medium ?? 0} · Low: {ev?.severityBreakdown?.low ?? 0}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
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

                  {c.imageUrl && (
                    <div className="pt-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        <Camera className="w-3 h-3 text-indigo-600" />
                        <span>Photo evidence on file: {c.imageUrl.split("/").pop()}</span>
                      </span>
                    </div>
                  )}
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
