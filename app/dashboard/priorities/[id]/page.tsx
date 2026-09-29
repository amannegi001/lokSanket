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
  ExternalLink,
  Users,
  FileCheck,
  Building,
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
        setAiError(err instanceof Error ? err.message : "Interpretation generation failed");
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
        <div className="flex-1 max-w-7xl mx-auto px-4 py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            Loading Issue Evidence Brief...
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
        <div className="flex-1 max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
          <AlertTriangle className="w-8 h-8 mx-auto text-rose-600" />
          <h2 className="text-lg font-bold text-slate-900">Issue Record Not Found</h2>
          <p className="text-sm text-slate-500">{error || "Cluster ID is invalid."}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-indigo-700 text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const ev = cluster.evidence;

  // Formula exact arithmetic contributions
  const demandContrib = (ev.demandVolumeScore * 0.3).toFixed(1);
  const severityContrib = (ev.severityScore * 0.25).toFixed(1);
  const trendContrib = (ev.trendScore * 0.2).toFixed(1);
  const geoContrib = (ev.geographicScore * 0.15).toFixed(1);
  const evidenceContrib = (ev.evidenceScore * 0.1).toFixed(1);

  const highCriticalReports = ev.severityBreakdown.critical + ev.severityBreakdown.high;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />

      {/* Breadcrumb header */}
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
            <span>Issue Record #{cluster._id.slice(-6)}</span>
            <span>·</span>
            <span className="text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded text-[10px] font-semibold border border-amber-200">
              Realistic Demonstration Data
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Document Header (Investigation Brief Style) */}
        <section className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1.5">
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
                LokSanket identified this as a <strong>{cluster.priorityLevel.toLowerCase()} priority issue</strong> based on the available evidence.
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

          {/* Human Review Status & Controls */}
          <div className="bg-slate-50 rounded p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <span className="font-bold text-slate-600 uppercase tracking-wider">
                Review Decision:
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
                {cluster.officialDecision.replace(/_/g, " ")}
              </span>
              {reviewMessage && (
                <span className="text-emerald-700 font-medium">✓ {reviewMessage}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleUpdateDecision("approved_for_action")}
                disabled={isUpdatingReview}
                className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Accept for Action
              </button>
              <button
                onClick={() => handleUpdateDecision("in_progress")}
                disabled={isUpdatingReview}
                className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                In Progress
              </button>
              <button
                onClick={() => handleUpdateDecision("deferred")}
                disabled={isUpdatingReview}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Defer
              </button>
            </div>
          </div>
        </section>

        {/* SECTION: "WHY WAS THIS FLAGGED?" (Factual Evidence First) */}
        <section className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Why was this flagged?
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified ground signals recorded by the intake engine
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="text-xl font-black text-slate-900">{ev.reportCount}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">Related Reports</div>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="text-xl font-black text-slate-900">{ev.affectedLocalities}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">Affected Localities</div>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="text-xl font-black text-blue-600">{ev.photoEvidenceCount}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">Photo Submissions</div>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="text-xl font-black text-rose-600">
                {ev.trendPercent > 0 ? `+${ev.trendPercent}%` : `${ev.trendPercent}%`}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">Recent 14d Trend</div>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200 col-span-2 sm:col-span-1">
              <div className="text-xl font-black text-slate-900">{highCriticalReports}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">High/Critical Reports</div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded border border-slate-200 text-xs text-slate-700 leading-relaxed">
            <strong>Factual Summary:</strong> {ev.reportCount} reports across {ev.affectedLocalities} localities, increasing recent activity ({ev.trendPercent > 0 ? `+${ev.trendPercent}%` : `${ev.trendPercent}%`}), {highCriticalReports} high/critical severity grievances, and {ev.photoEvidenceCount} photo submissions contributed to the overall priority assessment.
          </div>
        </section>

        {/* SECTION: PRIORITY BREAKDOWN (Analytical Breakdown) */}
        <section className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Priority Breakdown
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Deterministic mathematical calculation (Score: 0 to 100)
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Formula: Σ (Component × Weight)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] bg-slate-50/60">
                  <th className="py-2 px-3">Component</th>
                  <th className="py-2 px-3">Normalized Score</th>
                  <th className="py-2 px-3">Weight</th>
                  <th className="py-2 px-3 text-right">Calculation</th>
                  <th className="py-2 px-3 text-right">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Demand Volume</td>
                  <td className="py-2.5 px-3">{ev.demandVolumeScore} / 100</td>
                  <td className="py-2.5 px-3">30%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                    {ev.demandVolumeScore} × 30%
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    +{demandContrib}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Severity</td>
                  <td className="py-2.5 px-3">{ev.severityScore} / 100</td>
                  <td className="py-2.5 px-3">25%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                    {ev.severityScore} × 25%
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    +{severityContrib}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Recent Trend</td>
                  <td className="py-2.5 px-3">{ev.trendScore} / 100</td>
                  <td className="py-2.5 px-3">20%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                    {ev.trendScore} × 20%
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    +{trendContrib}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Geographic Concentration</td>
                  <td className="py-2.5 px-3">{ev.geographicScore} / 100</td>
                  <td className="py-2.5 px-3">15%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                    {ev.geographicScore} × 15%
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    +{geoContrib}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Evidence Strength</td>
                  <td className="py-2.5 px-3">{ev.evidenceScore} / 100</td>
                  <td className="py-2.5 px-3">10%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                    {ev.evidenceScore} × 10%
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    +{evidenceContrib}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                  <td colSpan={3} className="py-2.5 px-3 text-slate-900">
                    Final Deterministic Priority Score
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500 font-mono text-xs">
                    Sum
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-900 font-black text-sm">
                    {cluster.priorityScore.toFixed(1)} / 100
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* SECTION: EVIDENCE INTERPRETATION (Automated Evidence Summary) */}
        <section className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-700" />
                Evidence Interpretation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated evidence summary grounded in verified metrics (AI-assisted interpretation)
              </p>
            </div>

            <button
              onClick={handleGenerateAiExplanation}
              disabled={isGeneratingAi}
              className="px-3 py-1 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3 h-3 ${isGeneratingAi ? "animate-spin" : ""}`}
              />
              <span>{cluster.aiExplanation ? "Refresh Summary" : "Generate Summary"}</span>
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
              <p className="text-xs text-slate-500">
                Generating factual interpretation from verified statistics...
              </p>
            </div>
          ) : cluster.aiExplanation ? (
            <div className="bg-slate-50 p-4 rounded border border-slate-200 text-xs text-slate-800 leading-relaxed space-y-2 whitespace-pre-line font-normal">
              {cluster.aiExplanation}
            </div>
          ) : (
            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-slate-500">
                No automated summary generated yet. Click &ldquo;Generate Summary&rdquo; to formulate an interpretation of the verified statistics.
              </p>
            </div>
          )}

          <div className="text-[11px] text-slate-400 italic">
            Notice: LokSanket uses Gemini strictly to explain verified application statistics. The platform does not allow AI to compute statistics or make government decisions.
          </div>
        </section>

        {/* SECTION: CITIZEN SUBMISSIONS & LOCALITIES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Affected Localities */}
          <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center justify-between">
              <span>Affected Localities ({ev.affectedLocalities})</span>
              <Building className="w-4 h-4 text-slate-400" />
            </h3>
            <div className="space-y-1.5 text-xs text-slate-700">
              {ev.localities.map((loc, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-slate-50 border border-slate-200/80 flex items-center gap-2"
                >
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="line-clamp-1">{loc}</span>
                </div>
              ))}
            </div>

            {/* Impacted Demographics */}
            {ev.affectedGroups?.length > 0 && (
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

          {/* Traceable Ground-Truth Citizen Quotes */}
          <section className="md:col-span-2 bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Traceable Citizen Reports ({cluster.reportCount} total)
              </h3>
              <span className="text-[11px] text-slate-400">
                Sample ground-truth records
              </span>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {sampleComplaints.map((c) => (
                <div
                  key={c._id}
                  className="p-3 rounded bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {c.location || "Locality unspecified"}
                    </span>
                    <span className="uppercase text-[10px]">
                      {c.language} · {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-800 italic">&ldquo;{c.rawText}&rdquo;</p>
                  {c.imageUrl && (
                    <div className="pt-1">
                      <a
                        href={c.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-700 hover:underline"
                      >
                        <Camera className="w-3 h-3" />
                        <span>View photo evidence</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
