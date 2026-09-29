"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  Camera,
  MapPin,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  Users,
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
  const [sampleComplaints, setSampleComplaints] = useState<SampleComplaint[]>([]);
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
        const res = await fetch(`/api/priorities/${id}`);
        const data = await res.json();
        if (ignore) return;
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load cluster details");
        }
        setCluster(data.cluster);
        setSampleComplaints(data.sampleComplaints || []);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Error loading priority");
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
        setAiError(err instanceof Error ? err.message : "AI generation failed");
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
          throw new Error(data.error || "Failed to update review status");
        }
        setCluster((prev) =>
          prev ? { ...prev, officialDecision: newDecision } : prev
        );
        setReviewMessage(`Decision updated to: ${newDecision.replace(/_/g, " ")}`);
        setTimeout(() => setReviewMessage(null), 3500);
      } catch (err: unknown) {
        setReviewMessage(err instanceof Error ? err.message : "Update failed");
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-8 flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
          <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
            Loading Constituency Issue Evidence...
          </p>
        </div>
      </div>
    );
  }

  if (error || !cluster) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 rounded-xl p-8 border border-rose-200 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 mx-auto text-rose-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
            Priority Issue Not Found
          </h2>
          <p className="text-sm text-slate-500">{error || "Cluster ID is invalid."}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const ev = cluster.evidence;

  // Formula contributions calculated transparently from backend values
  const demandContrib = (ev.demandVolumeScore * 0.3).toFixed(1);
  const severityContrib = (ev.severityScore * 0.25).toFixed(1);
  const trendContrib = (ev.trendScore * 0.2).toFixed(1);
  const geoContrib = (ev.geographicScore * 0.15).toFixed(1);
  const evidenceContrib = (ev.evidenceScore * 0.1).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans pb-20">
      {/* Top Banner: Synthetic Demonstration Data Disclaimer */}
      <aside aria-label="Demonstration Notice" className="bg-amber-50 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-900 px-4 py-2 text-xs text-amber-900 dark:text-amber-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px]">
          <span className="font-semibold">
            Realistic Demonstration Data · Issue Evidence Record #{cluster._id.slice(-6)}
          </span>
          <span className="italic text-amber-800 dark:text-amber-300">
            AI-generated insights are decision-support recommendations and should be verified against available evidence before action.
          </span>
        </div>
      </aside>

      {/* Breadcrumb Navigation Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-4 sm:px-6 lg:px-8 py-3.5 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Decision Support Mode</span>
            <span className="text-slate-300 dark:text-zinc-700">·</span>
            <span className="font-mono text-[11px] text-slate-500">
              ID: {cluster._id}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Hero */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${
                    cluster.priorityLevel === "High"
                      ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300"
                      : cluster.priorityLevel === "Medium"
                      ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {cluster.priorityLevel} Priority
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                  {cluster.category}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                  {cluster.subcategory}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {cluster.wardIds.join(", ")}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight leading-tight">
                {cluster.title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                LokSanket identified this as a{" "}
                <strong className="text-slate-800 dark:text-zinc-200 lowercase">
                  {cluster.priorityLevel} priority issue
                </strong>{" "}
                based on the available evidence.
              </p>
            </div>

            {/* Score Pill */}
            <div className="shrink-0 bg-slate-50 dark:bg-zinc-800/80 rounded-xl p-4 border border-slate-200 dark:border-zinc-700 text-center min-w-[150px]">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Priority Score
              </div>
              <div className="text-4xl font-black text-slate-900 dark:text-zinc-50 mt-1">
                {cluster.priorityScore.toFixed(1)}
              </div>
              <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Scale 0 to 100
              </div>
            </div>
          </div>

          {/* Human Review Decision Panel */}
          <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-slate-200 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Official Review Status:
              </span>
              <span
                className={`text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider border ${
                  cluster.officialDecision === "approved_for_action"
                    ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200"
                    : cluster.officialDecision === "deferred" ||
                      cluster.officialDecision === "rejected"
                    ? "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200"
                    : "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200"
                }`}
              >
                {cluster.officialDecision.replace(/_/g, " ")}
              </span>
              {reviewMessage && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ {reviewMessage}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 mr-1">Action:</span>
              <button
                onClick={() => handleUpdateDecision("approved_for_action")}
                disabled={isUpdatingReview}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Accept for Action
              </button>
              <button
                onClick={() => handleUpdateDecision("in_progress")}
                disabled={isUpdatingReview}
                className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-slate-800 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                In Progress
              </button>
              <button
                onClick={() => handleUpdateDecision("deferred")}
                disabled={isUpdatingReview}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 dark:border-zinc-700 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Defer / Review Later
              </button>
            </div>
          </div>
        </section>

        {/* 2-Column Intelligence Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Factual Evidence & Mathematical Priority Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 6: "WHY WAS THIS FLAGGED?" Factual Ground Evidence */}
            <section className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Why was this flagged?
                  </h2>
                  <p className="text-xs text-slate-500">
                    Verified factual signals extracted directly from complaint data
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {ev.reportCount} Verified Citations
                </span>
              </div>

              {/* 6 Key Evidence Statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                    1. Citizen Demand
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-zinc-100">
                    {ev.reportCount}
                  </span>
                  <span className="text-xs text-slate-500 block">
                    related complaint reports
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                    2. Affected Spots
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-zinc-100">
                    {ev.affectedLocalities}
                  </span>
                  <span className="text-xs text-slate-500 block">
                    localities in {cluster.wardIds.join(", ")}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                    3. Ground Evidence
                  </span>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {ev.photoEvidenceCount}
                  </span>
                  <span className="text-xs text-slate-500 block">
                    photo submissions
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                    4. Recent Trend
                  </span>
                  <span
                    className={`text-2xl font-black ${
                      ev.trendPercent > 0
                        ? "text-rose-600"
                        : ev.trendPercent < 0
                        ? "text-emerald-600"
                        : "text-slate-700"
                    }`}
                  >
                    {ev.trendPercent > 0 ? `+${ev.trendPercent}%` : `${ev.trendPercent}%`}
                  </span>
                  <span className="text-xs text-slate-500 block">
                    {ev.recentCount} recent vs {ev.previousCount} prior
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                    5. High/Critical Severity
                  </span>
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    {ev.severityBreakdown.critical + ev.severityBreakdown.high}
                  </span>
                  <span className="text-xs text-slate-500 block">
                    of {ev.reportCount} reports ({Math.round(((ev.severityBreakdown.critical + ev.severityBreakdown.high) / ev.reportCount) * 100)}%)
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                    6. Priority Score
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-zinc-100">
                    {cluster.priorityScore.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500 block">
                    Level: {cluster.priorityLevel}
                  </span>
                </div>
              </div>

              {/* Severity Breakdown Bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Severity Distribution:</span>
                  <span>
                    Critical: <strong>{ev.severityBreakdown.critical}</strong> ·
                    High: <strong>{ev.severityBreakdown.high}</strong> ·
                    Medium: <strong>{ev.severityBreakdown.medium}</strong> ·
                    Low: <strong>{ev.severityBreakdown.low}</strong>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-zinc-800 flex overflow-hidden">
                  <div
                    style={{
                      width: `${(ev.severityBreakdown.critical / ev.reportCount) * 100}%`,
                    }}
                    className="bg-red-600"
                    title={`Critical: ${ev.severityBreakdown.critical}`}
                  />
                  <div
                    style={{
                      width: `${(ev.severityBreakdown.high / ev.reportCount) * 100}%`,
                    }}
                    className="bg-orange-500"
                    title={`High: ${ev.severityBreakdown.high}`}
                  />
                  <div
                    style={{
                      width: `${(ev.severityBreakdown.medium / ev.reportCount) * 100}%`,
                    }}
                    className="bg-amber-400"
                    title={`Medium: ${ev.severityBreakdown.medium}`}
                  />
                  <div
                    style={{
                      width: `${(ev.severityBreakdown.low / ev.reportCount) * 100}%`,
                    }}
                    className="bg-blue-400"
                    title={`Low: ${ev.severityBreakdown.low}`}
                  />
                </div>
              </div>

              {/* Affected Groups */}
              {ev.affectedGroups?.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 text-xs">
                  <Users className="w-3.5 h-3.5 text-slate-400 mr-1" />
                  <span className="text-slate-500 font-semibold">Impacted Groups:</span>
                  {ev.affectedGroups.map((group, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium"
                    >
                      {group}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Section 5: Deterministic Priority Formula Breakdown */}
            <section className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-6 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center justify-between">
                  <span>Deterministic Priority Engine Breakdown</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                    Formula Verified
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Priority Score = 30% Demand Volume + 25% Severity + 20% Recent Trend + 15% Geo Concentration + 10% Evidence Strength
                </p>
              </div>

              {/* Component Contribution Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 uppercase text-[10px]">
                      <th className="py-2">Component</th>
                      <th className="py-2">Normalized Score</th>
                      <th className="py-2">Weight</th>
                      <th className="py-2 text-right">Calculation</th>
                      <th className="py-2 text-right">Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-zinc-300">
                    <tr>
                      <td className="py-2.5 font-semibold text-slate-900 dark:text-zinc-100">
                        Demand Volume
                      </td>
                      <td className="py-2.5">{ev.demandVolumeScore} / 100</td>
                      <td className="py-2.5">30%</td>
                      <td className="py-2.5 text-right font-mono text-slate-500">
                        {ev.demandVolumeScore} × 30%
                      </td>
                      <td className="py-2.5 text-right font-bold text-slate-900 dark:text-zinc-100">
                        +{demandContrib}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-slate-900 dark:text-zinc-100">
                        Severity
                      </td>
                      <td className="py-2.5">{ev.severityScore} / 100</td>
                      <td className="py-2.5">25%</td>
                      <td className="py-2.5 text-right font-mono text-slate-500">
                        {ev.severityScore} × 25%
                      </td>
                      <td className="py-2.5 text-right font-bold text-slate-900 dark:text-zinc-100">
                        +{severityContrib}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-slate-900 dark:text-zinc-100">
                        Recent Trend
                      </td>
                      <td className="py-2.5">{ev.trendScore} / 100</td>
                      <td className="py-2.5">20%</td>
                      <td className="py-2.5 text-right font-mono text-slate-500">
                        {ev.trendScore} × 20%
                      </td>
                      <td className="py-2.5 text-right font-bold text-slate-900 dark:text-zinc-100">
                        +{trendContrib}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-slate-900 dark:text-zinc-100">
                        Geographic Concentration
                      </td>
                      <td className="py-2.5">{ev.geographicScore} / 100</td>
                      <td className="py-2.5">15%</td>
                      <td className="py-2.5 text-right font-mono text-slate-500">
                        {ev.geographicScore} × 15%
                      </td>
                      <td className="py-2.5 text-right font-bold text-slate-900 dark:text-zinc-100">
                        +{geoContrib}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-slate-900 dark:text-zinc-100">
                        Evidence Strength
                      </td>
                      <td className="py-2.5">{ev.evidenceScore} / 100</td>
                      <td className="py-2.5">10%</td>
                      <td className="py-2.5 text-right font-mono text-slate-500">
                        {ev.evidenceScore} × 10%
                      </td>
                      <td className="py-2.5 text-right font-bold text-slate-900 dark:text-zinc-100">
                        +{evidenceContrib}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50">
                      <td colSpan={3} className="py-2.5 font-extrabold text-slate-900 dark:text-zinc-100">
                        Final Deterministic Priority Score
                      </td>
                      <td className="py-2.5 text-right font-mono text-xs text-slate-500">
                        Σ Contributions
                      </td>
                      <td className="py-2.5 text-right font-black text-slate-900 dark:text-zinc-100 text-sm">
                        {cluster.priorityScore.toFixed(1)} / 100
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* Ground-Truth Traceable Sample Complaints */}
            <section className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                    Traceable Citizen Voice Submissions
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sample reports from MongoDB underpinning this issue cluster
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  Showing {sampleComplaints.length} of {cluster.reportCount} reports
                </span>
              </div>

              <div className="space-y-3">
                {sampleComplaints.map((c) => (
                  <div
                    key={c._id}
                    className="p-3.5 rounded-lg bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {c.location || "Locality unspecified"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="uppercase text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">
                          {c.language}
                        </span>
                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p className="text-slate-800 dark:text-zinc-200 italic">
                      &ldquo;{c.rawText}&rdquo;
                    </p>
                    {c.imageUrl && (
                      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-blue-600 dark:text-blue-400">
                        <Camera className="w-3 h-3" />
                        <a
                          href={c.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-0.5"
                        >
                          View photo evidence submission
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Gemini Decision-Support Explanation & Affected Localities */}
          <div className="space-y-6">
            {/* Section 7: Gemini Explanation Component */}
            <section className="bg-white dark:bg-zinc-900 rounded-xl border border-emerald-300 dark:border-emerald-800/80 p-6 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Gemini Intelligence Explanation
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Grounded strictly in verified evidence metrics
                  </p>
                </div>

                <button
                  onClick={handleGenerateAiExplanation}
                  disabled={isGeneratingAi}
                  className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  title="Generate or refresh Gemini explanation"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isGeneratingAi ? "animate-spin" : ""}`}
                  />
                  <span>{cluster.aiExplanation ? "Regenerate" : "Generate"}</span>
                </button>
              </div>

              {aiError && (
                <div className="p-2.5 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  {aiError}
                </div>
              )}

              {isGeneratingAi ? (
                <div className="py-8 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                  <p className="text-xs text-slate-500 font-medium">
                    Gemini is analyzing verified statistics & constructing explanation...
                  </p>
                </div>
              ) : cluster.aiExplanation ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-slate-700 dark:text-zinc-300 space-y-2 whitespace-pre-line bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/60">
                  {cluster.aiExplanation}
                </div>
              ) : (
                <div className="py-8 text-center space-y-3">
                  <HelpCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-700" />
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    No explanation generated yet. Click the button above to request a Gemini synthesis grounded in verified data.
                  </p>
                  <button
                    onClick={handleGenerateAiExplanation}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  >
                    Generate Gemini Explanation
                  </button>
                </div>
              )}

              <div className="text-[11px] text-slate-400 italic pt-2 border-t border-slate-100 dark:border-zinc-800">
                Notice: Gemini provides analytical synthesis of application data. It does not calculate statistics or make executive government determinations.
              </div>
            </section>

            {/* Affected Localities Hotspot List */}
            <section className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-6 shadow-2xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider flex items-center justify-between">
                <span>Affected Localities ({ev.affectedLocalities})</span>
                <MapPin className="w-4 h-4 text-indigo-500" />
              </h2>
              <p className="text-xs text-slate-500">
                Ground locations where grievances were concentrated
              </p>

              <div className="space-y-2 pt-1">
                {ev.localities.map((loc, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-200 flex items-center gap-2"
                  >
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="line-clamp-1">{loc}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
