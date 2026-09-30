"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/context/LanguageContext";
import {
  formatCategoryName,
  formatClusterTitleDisplay,
  formatWardDisplay,
  formatSubcategoryName,
  formatRelativeTime,
} from "@/lib/i18n";
import {
  AlertTriangle,
  TrendingUp,
  MapPin,
  FileText,
  Camera,
  Layers,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  LogOut,
  CheckCircle2,
  Sliders,
  XCircle,
  Clock,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

interface ClusterEvidence {
  reportCount: number;
  affectedLocalities: number;
  localities: string[];
  photoEvidenceCount: number;
  trendPercent: number;
  recentCount: number;
  previousCount: number;
  demandVolumeScore: number;
  severityScore: number;
  trendScore: number;
  geographicScore: number;
  evidenceScore: number;
  priorityScore: number;
}

interface IssueClusterItem {
  _id: string;
  title: string;
  category: string;
  subcategory: string;
  wardIds: string[];
  reportCount: number;
  severityScore: number;
  trendScore: number;
  geographicScore: number;
  evidenceScore: number;
  priorityScore: number;
  priorityLevel: "High" | "Medium" | "Low";
  evidence: ClusterEvidence;
  officialDecision: string;
  review?: {
    decision: "accept" | "adjust" | "reject";
    note?: string;
    adjustedPriorityLevel?: "high" | "medium" | "low";
    reviewedAt?: string;
  };
  createdAt: string;
}

interface RecentReportItem {
  _id: string;
  category: string;
  subcategory: string;
  severity: string;
  location: string;
  createdAt: string;
  clusterId: string | null;
}

interface DashboardData {
  kpis: {
    totalReports: number;
    totalClusters: number;
    highPriorityCount: number;
    mediumPriorityCount: number;
    lowPriorityCount: number;
    affectedLocalitiesCount: number;
    reportsThisMonth: number;
  };
  categoryDistribution: { category: string; count: number }[];
  trendTimeline: { date: string; count: number }[];
  topClusters: IssueClusterItem[];
  recentReports?: RecentReportItem[];
  datasetInfo: {
    isSynthetic: boolean;
    label: string;
    constituency: string;
    disclaimer: string;
  };
}

interface ConstituencyDashboardProps {
  mode: "public" | "official";
}

export default function ConstituencyDashboard({ mode }: ConstituencyDashboardProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const td = t.dashboard;

  const [data, setData] = useState<DashboardData | null>(null);
  const [allClusters, setAllClusters] = useState<IssueClusterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAllClusters, setShowAllClusters] = useState(false);

  const [isRebuilding, startRebuildTransition] = useTransition();
  const [rebuildStatus, setRebuildStatus] = useState<string | null>(null);
  const [isLoggingOut, startLogoutTransition] = useTransition();

  const isOfficial = mode === "official";

  const reloadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const dashRes = await fetch("/api/dashboard");
      const dashJson = await dashRes.json();

      if (!dashRes.ok || !dashJson.success) {
        throw new Error(dashJson.error || "Failed to load dashboard data");
      }

      setData(dashJson.data);
      setAllClusters(dashJson.data.clusters || dashJson.data.topClusters || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function initialLoad() {
      try {
        const dashRes = await fetch("/api/dashboard");
        const dashJson = await dashRes.json();

        if (ignore) return;

        if (!dashRes.ok || !dashJson.success) {
          throw new Error(dashJson.error || "Failed to load dashboard data");
        }

        setData(dashJson.data);
        setAllClusters(dashJson.data.clusters || dashJson.data.topClusters || []);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Error loading dashboard");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    initialLoad();

    return () => {
      ignore = true;
    };
  }, []);

  const handleRebuild = () => {
    if (!isOfficial) return;

    startRebuildTransition(async () => {
      try {
        setRebuildStatus("Recalculating clusters & deterministic priority scores...");
        const res = await fetch("/api/priorities/rebuild", { method: "POST" });
        const json = await res.json();
        if (json.success) {
          setRebuildStatus("Priority engine recalculated successfully.");
          await reloadData();
        } else {
          setRebuildStatus(`Rebuild failed: ${json.error}`);
        }
      } catch {
        setRebuildStatus("Rebuild error. Please try again.");
      } finally {
        setTimeout(() => setRebuildStatus(null), 4000);
      }
    });
  };

  const handleLogout = () => {
    startLogoutTransition(async () => {
      try {
        await fetch("/api/official/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      } catch {
        router.push("/");
      }
    });
  };

  const filteredClusters = allClusters.filter((c) => {
    if (selectedLevel !== "all" && c.priorityLevel !== selectedLevel) {
      return false;
    }
    if (selectedCategory !== "all" && c.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const displayedClusters = showAllClusters
    ? filteredClusters
    : filteredClusters.slice(0, 5);

  const uniqueCategories = Array.from(
    new Set(allClusters.map((c) => c.category))
  ).sort();

  const getPriorityBadgeStyles = (level: string) => {
    switch (level) {
      case "High":
        return "bg-rose-50 text-rose-700 border-rose-300 font-bold";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-300 font-bold";
      case "Low":
      default:
        return "bg-slate-100 text-slate-700 border-slate-300 font-medium";
    }
  };

  const getSeverityBadge = (severity: string) => {
    const s = severity?.toLowerCase();
    switch (s) {
      case "critical":
        return {
          label: language === "hi" ? "गंभीर" : "Critical",
          className: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
        };
      case "high":
        return {
          label: td.levelHigh,
          className: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
        };
      case "medium":
        return {
          label: td.levelMedium,
          className: "bg-amber-50 text-amber-700 border-amber-300 font-semibold",
        };
      case "low":
      default:
        return {
          label: td.levelLow,
          className: "bg-slate-100 text-slate-700 border-slate-200 font-medium",
        };
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />

      {/* Official Mode Banner (UK Cabinet Office / GDS style) */}
      {isOfficial && (
        <aside aria-label="Official Review Session" className="bg-indigo-950 text-indigo-100 px-4 py-2 border-b border-indigo-900 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                Official Review Workspace (Demo Access)
              </span>
              <span className="text-indigo-400 hidden sm:inline">|</span>
              <span className="text-indigo-200 hidden sm:inline">
                Human-in-the-loop review, priority recalculation &amp; development brief generation
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/official/briefs"
                className="text-xs font-semibold text-indigo-200 hover:text-white flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Briefs</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-2.5 py-1 rounded bg-indigo-900 hover:bg-indigo-800 text-indigo-100 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Exit Official Mode and return to public site"
              >
                <LogOut className="w-3 h-3" />
                <span>Exit Official Mode</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Rebuild notification banner */}
      {rebuildStatus && (
        <div className="bg-indigo-50 border-b border-indigo-200 text-indigo-900 text-xs py-2 text-center font-medium animate-in fade-in">
          {rebuildStatus}
        </div>
      )}

      {loading && !data ? (
        <main className="flex-1 max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="w-8 h-8 border-3 border-indigo-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-slate-700">
            {td.loadingSummary}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {td.loadingSub}
          </p>
        </main>
      ) : error ? (
        <main className="flex-1 max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="inline-block p-6 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm max-w-md mx-auto space-y-3">
            <AlertTriangle className="w-6 h-6 mx-auto text-rose-600" />
            <p className="font-bold">{td.loadError}</p>
            <p className="text-xs text-rose-700">{error}</p>
            <button
              onClick={reloadData}
              className="px-4 py-1.5 bg-rose-700 text-white rounded text-xs font-semibold hover:bg-rose-800 cursor-pointer"
            >
              {td.retryBtn}
            </button>
          </div>
        </main>
      ) : data ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Top Metadata Header (UK ONS style) */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                <span>{isOfficial ? td.workspaceSubtitleOfficial : td.workspaceSubtitlePublic}</span>
                <span>·</span>
                <span className="text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200 text-[10px]">
                  {td.demoBadge}
                </span>
                {!isOfficial && (
                  <span className="text-slate-600 bg-slate-200/80 px-1.5 py-0.2 rounded text-[10px]">
                    {td.publicReadOnly}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {isOfficial ? td.titleOfficial : td.titlePublic}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {isOfficial ? td.subtitleOfficial : td.subtitlePublic}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Official-only action: Development Brief */}
              {isOfficial && (
                <Link
                  href="/official/briefs"
                  className="text-xs px-3 py-1.5 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition-colors flex items-center gap-1.5"
                  title="Generate evidence-backed constituency development brief"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{td.briefsBtn}</span>
                </Link>
              )}

              {/* Official-only action: Recalculate Priorities */}
              {isOfficial && (
                <button
                  onClick={handleRebuild}
                  disabled={isRebuilding}
                  className="text-xs px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Recalculate deterministic priorities from MongoDB"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRebuilding ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">{td.recalculateBtn}</span>
                </button>
              )}

              {/* Public link to Official Access */}
              {!isOfficial && (
                <Link
                  href="/official/access"
                  className="text-xs px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors flex items-center gap-1.5"
                  title="Access Official Review Workspace (Demo)"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                  <span>{td.officialReviewBtn}</span>
                </Link>
              )}

              {/* Citizen CTA: Report Issue */}
              <Link
                href="/report"
                className="text-xs px-3 py-1.5 rounded bg-indigo-700 hover:bg-indigo-800 text-white font-semibold transition-colors flex items-center gap-1"
              >
                <span>{td.reportIssueBtn}</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Overview KPI Row (ONS / Public Sector Style) */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>{td.kpiTotalReports}</span>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight mt-1.5">
                {data.kpis?.totalReports?.toLocaleString() ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {td.kpiAcrossCategories(data.categoryDistribution?.length ?? 9)}
              </div>
            </div>

            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>{td.kpiHighPriority}</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-3xl font-black text-rose-700 tracking-tight mt-1.5">
                {data.kpis?.highPriorityCount ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {td.kpiHighPrioritySub}
              </div>
            </div>

            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>{td.kpiMediumPriority}</span>
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-3xl font-black text-amber-700 tracking-tight mt-1.5">
                {data.kpis?.mediumPriorityCount ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {td.kpiMediumPrioritySub}
              </div>
            </div>

            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>{td.kpiAffectedLocalities}</span>
                <MapPin className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight mt-1.5">
                {data.kpis?.affectedLocalitiesCount ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {td.kpiAffectedLocalitiesSub}
              </div>
            </div>
          </section>

          {/* Core Table: Prioritized Issues */}
          <section className="bg-white rounded-lg border border-slate-200 shadow-2xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {td.tableHeading}
                </h2>
                <p className="text-xs text-slate-500">
                  {isOfficial ? td.tableSubOfficial : td.tableSubPublic}
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Level filter */}
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                >
                  <option value="all">{td.filterAllPriorities}</option>
                  <option value="High">{td.filterHighOnly}</option>
                  <option value="Medium">{td.filterMediumOnly}</option>
                  <option value="Low">{td.filterLowOnly}</option>
                </select>

                {/* Category filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                >
                  <option value="all">{td.filterAllCategories}</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {formatCategoryName(cat, language)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    <th className="py-2.5 px-3">{td.colIssueCluster}</th>
                    <th className="py-2.5 px-3">{td.colCategory}</th>
                    <th className="py-2.5 px-3">{td.colWardsLocalities}</th>
                    <th className="py-2.5 px-3 text-right">{td.colReports}</th>
                    <th className="py-2.5 px-3 text-right">{td.colTrend}</th>
                    <th className="py-2.5 px-3">{td.colEvidence}</th>
                    <th className="py-2.5 px-3 text-right">{td.colPriorityScore}</th>
                    {isOfficial && <th className="py-2.5 px-3">{td.colOfficialDecision}</th>}
                    <th className="py-2.5 px-3 text-right">{td.colAction}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedClusters.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isOfficial ? 9 : 8}
                        className="py-8 text-center text-slate-400 text-xs italic"
                      >
                        {td.noIssuesMatch}
                      </td>
                    </tr>
                  ) : (
                    displayedClusters.map((cluster) => {
                      const trend = cluster.evidence?.trendPercent ?? 0;
                      const isPositiveTrend = trend > 0;
                      const detailHref = isOfficial
                        ? `/official/priorities/${cluster._id}`
                        : `/dashboard/priorities/${cluster._id}`;

                      return (
                        <tr
                          key={cluster._id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* Title */}
                          <td className="py-3 px-3 font-semibold text-slate-900 max-w-xs">
                            <Link
                              href={detailHref}
                              className="hover:text-indigo-700 transition-colors block line-clamp-2"
                            >
                              {formatClusterTitleDisplay(cluster.title, language)}
                            </Link>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                              {formatCategoryName(cluster.category, language)}
                            </span>
                          </td>

                          {/* Localities */}
                          <td className="py-3 px-3 max-w-[200px] text-slate-600">
                            <div className="flex items-center gap-1 truncate text-[11px]">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">
                                {cluster.evidence?.localities?.length
                                  ? cluster.evidence.localities
                                      .slice(0, 2)
                                      .map((loc) => formatWardDisplay(loc, language))
                                      .join(", ") +
                                    (cluster.evidence.localities.length > 2
                                      ? ` +${cluster.evidence.localities.length - 2}`
                                      : "")
                                  : cluster.wardIds?.map((w) => formatWardDisplay(w, language)).join(", ") ||
                                    (language === "hi" ? "केंद्रीय" : "Central")}
                              </span>
                            </div>
                          </td>

                          {/* Report Count */}
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {cluster.reportCount}
                          </td>

                          {/* Trend */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <span
                              className={`font-semibold ${
                                isPositiveTrend
                                  ? "text-rose-700 font-bold"
                                  : trend < 0
                                  ? "text-emerald-700"
                                  : "text-slate-600"
                              }`}
                            >
                              {isPositiveTrend ? `↑ +${trend}%` : `${trend}%`}
                            </span>
                          </td>

                          {/* Evidence */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-[11px]">
                              {cluster.evidence?.photoEvidenceCount > 0 ? (
                                <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  <Camera className="w-3 h-3 text-blue-600" />
                                  {td.evidencePhotos(cluster.evidence.photoEvidenceCount)}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">
                                  {td.evidenceTextOnly}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Priority Score & Level */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-black text-slate-900 text-sm">
                                {cluster.priorityScore.toFixed(1)}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.2 rounded border ${getPriorityBadgeStyles(
                                  cluster.priorityLevel
                                )}`}
                              >
                                {cluster.priorityLevel === "High"
                                  ? td.levelHigh
                                  : cluster.priorityLevel === "Medium"
                                  ? td.levelMedium
                                  : td.levelLow}
                              </span>
                            </div>
                          </td>

                          {/* Official Decision Column (in official mode) */}
                          {isOfficial && (
                            <td className="py-3 px-3 whitespace-nowrap">
                              {cluster.review && cluster.review.decision ? (
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                                    cluster.review.decision === "accept"
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                      : cluster.review.decision === "adjust"
                                      ? "bg-blue-50 text-blue-800 border-blue-300"
                                      : "bg-rose-50 text-rose-800 border-rose-300"
                                  }`}
                                >
                                  {cluster.review.decision === "accept" && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                  {cluster.review.decision === "adjust" && <Sliders className="w-3 h-3 text-blue-600" />}
                                  {cluster.review.decision === "reject" && <XCircle className="w-3 h-3 text-rose-600" />}
                                  {cluster.review.decision === "adjust"
                                    ? `${td.decisionAdjusted} → ${(
                                        cluster.review.adjustedPriorityLevel === "high"
                                          ? td.levelHigh
                                          : cluster.review.adjustedPriorityLevel === "medium"
                                          ? td.levelMedium
                                          : cluster.review.adjustedPriorityLevel === "low"
                                          ? td.levelLow
                                          : cluster.review.adjustedPriorityLevel || ""
                                      ).toUpperCase()}`
                                    : cluster.review.decision === "accept"
                                    ? td.decisionAccepted
                                    : td.decisionRejected}
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  {td.decisionPending}
                                </span>
                              )}
                            </td>
                          )}

                          {/* Action Link */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <Link
                              href={detailHref}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                                isOfficial
                                  ? "bg-indigo-700 hover:bg-indigo-800 text-white shadow-2xs"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                              }`}
                            >
                              <span>{isOfficial ? td.reviewAndAction : td.viewEvidence}</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Toggle to expand/collapse full list */}
            {filteredClusters.length > 5 && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {td.showingCount(displayedClusters.length, filteredClusters.length)}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllClusters(!showAllClusters)}
                  className="font-bold text-indigo-700 hover:text-indigo-800 cursor-pointer"
                >
                  {showAllClusters
                    ? td.showTop5Only
                    : td.viewAllIssues(filteredClusters.length)}
                </button>
              </div>
            )}

            {/* Public Read-Only Transparency Footnote */}
            {!isOfficial && (
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                <p>
                  {td.publicFootnoteNotice}
                </p>
                <Link
                  href="/official/access"
                  className="font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{td.publicFootnoteLink}</span>
                </Link>
              </div>
            )}
          </section>

          {/* Recent Citizen Reports Section (Public Real-Time Ingestion Stream) */}
          <section className="bg-white rounded-lg border border-slate-200 shadow-2xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    {td.recentReportsHeading}
                  </h2>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 uppercase tracking-wider">
                    {language === "hi" ? "लाइव इनटेक" : "Live Intake"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {td.recentReportsSub}
                </p>
              </div>

              {/* Pipeline Step Tag */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="font-medium">
                  {language === "hi"
                    ? "नागरिक इनपुट → जेमिनी विश्लेषण → क्लस्टरिंग"
                    : "Citizen Intake → Gemini → Clustering"}
                </span>
              </div>
            </div>

            {/* Recent Reports Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    <th className="py-2.5 px-3">{td.recentReportsColCategory}</th>
                    <th className="py-2.5 px-3">{td.recentReportsColSubcategory}</th>
                    <th className="py-2.5 px-3">{td.recentReportsColWard}</th>
                    <th className="py-2.5 px-3">{td.recentReportsColTime}</th>
                    <th className="py-2.5 px-3">{td.recentReportsColSeverity}</th>
                    <th className="py-2.5 px-3 text-right">{td.recentReportsColStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!data.recentReports || data.recentReports.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                        {td.noRecentReports}
                      </td>
                    </tr>
                  ) : (
                    data.recentReports.map((report) => {
                      const sev = getSeverityBadge(report.severity);
                      const isAwaiting = !report.clusterId;

                      return (
                        <tr key={report._id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Category */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                              {formatCategoryName(report.category, language)}
                            </span>
                          </td>

                          {/* Subcategory */}
                          <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            {formatSubcategoryName(report.subcategory, language)}
                          </td>

                          {/* Ward / Locality (Sanitized, non-sensitive) */}
                          <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                            <div className="flex items-center gap-1 text-[11px]">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{formatWardDisplay(report.location, language)}</span>
                            </div>
                          </td>

                          {/* Received Time */}
                          <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                            <div className="flex items-center gap-1 text-[11px]">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{formatRelativeTime(report.createdAt, language)}</span>
                            </div>
                          </td>

                          {/* Severity */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={`text-[10px] px-2 py-0.2 rounded border ${sev.className}`}>
                              {sev.label}
                            </span>
                          </td>

                          {/* Pipeline Status */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            {isAwaiting ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>{td.statusAwaitingClustering}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>{td.statusClustered}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pipeline Notice */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
              <span className="italic">{td.pipelineNotice}</span>
              <Link
                href="/report"
                className="font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1"
              >
                <span>{td.reportIssueBtn}</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </section>

          {/* Analytical Charts: Trend & Category Distribution */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Trend over time */}
            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>{td.chartTrendHeading}</span>
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {td.chartTrendSub}
                </p>
              </div>

              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trendTimeline || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#64748B" }}
                      axisLine={{ stroke: "#CBD5E1" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#64748B" }}
                      axisLine={{ stroke: "#CBD5E1" }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #CBD5E1",
                        borderRadius: "6px",
                        fontSize: "11px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#4F46E5"
                      strokeWidth={2}
                      fill="#EEF2FF"
                      name={td.chartReportsSeries}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Category Breakdown */}
            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>{td.chartCategoryHeading}</span>
                  <Layers className="w-4 h-4 text-slate-400" />
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {td.chartCategorySub}
                </p>
              </div>

              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(data.categoryDistribution || []).map((item) => ({
                      ...item,
                      displayCategory: formatCategoryName(item.category, language),
                    }))}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} />
                    <YAxis
                      dataKey="displayCategory"
                      type="category"
                      tick={{ fontSize: 10, fill: "#334155" }}
                      width={language === "hi" ? 115 : 85}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #CBD5E1",
                        borderRadius: "6px",
                        fontSize: "11px",
                      }}
                    />
                    <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} name={td.chartReportsSeries} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Dataset Provenance & Methodology Notice (UK ONS style) */}
          <section className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs text-xs space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
              <Layers className="w-3.5 h-3.5 text-indigo-700" />
              <span>{td.provenanceHeading}</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              {td.provenanceBody}
            </p>
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span>
                {td.constituencyLabel}{" "}
                {language === "hi"
                  ? "केंद्रीय प्रदर्शन निर्वाचन क्षेत्र (वार्ड 1–25)"
                  : data.datasetInfo?.constituency || "Central Demonstration Constituency (Ward 1–25)"}
              </span>
              <span>·</span>
              <span>
                {td.datasetLabel}{" "}
                {language === "hi" ? td.demoBadge : data.datasetInfo?.label || td.demoBadge}
              </span>
              <span>·</span>
              <span>
                {isOfficial
                  ? td.officialOrientation
                  : td.publicOrientation}
              </span>
            </div>
          </section>
        </main>
      ) : null}

      <Footer />
    </div>
  );
}
