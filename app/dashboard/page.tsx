"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
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
  createdAt: string;
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
  datasetInfo: {
    isSynthetic: boolean;
    label: string;
    constituency: string;
    disclaimer: string;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [allClusters, setAllClusters] = useState<IssueClusterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAllClusters, setShowAllClusters] = useState(false);

  const [isRebuilding, startRebuildTransition] = useTransition();
  const [rebuildStatus, setRebuildStatus] = useState<string | null>(null);

  const reloadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, clustersRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/priorities?limit=100"),
      ]);

      const dashJson = await dashRes.json();
      const clustersJson = await clustersRes.json();

      if (!dashRes.ok || !dashJson.success) {
        throw new Error(dashJson.error || "Failed to load dashboard data");
      }

      setData(dashJson.data);
      if (clustersJson.success) {
        setAllClusters(clustersJson.clusters);
      }
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
        const [dashRes, clustersRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/priorities?limit=100"),
        ]);

        const dashJson = await dashRes.json();
        const clustersJson = await clustersRes.json();

        if (ignore) return;

        if (!dashRes.ok || !dashJson.success) {
          throw new Error(dashJson.error || "Failed to load dashboard data");
        }

        setData(dashJson.data);
        if (clustersJson.success) {
          setAllClusters(clustersJson.clusters);
        }
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />

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
            Loading Constituency Intelligence Summary...
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Grounded directly in MongoDB Atlas data.
          </p>
        </main>
      ) : error ? (
        <main className="flex-1 max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="inline-block p-6 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm max-w-md mx-auto space-y-3">
            <AlertTriangle className="w-6 h-6 mx-auto text-rose-600" />
            <p className="font-bold">Unable to load dashboard data</p>
            <p className="text-xs text-rose-700">{error}</p>
            <button
              onClick={reloadData}
              className="px-4 py-1.5 bg-rose-700 text-white rounded text-xs font-semibold hover:bg-rose-800 cursor-pointer"
            >
              Retry
            </button>
          </div>
        </main>
      ) : data ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Top Metadata Header (UK ONS style) */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                <span>Constituency Decision Support</span>
                <span>·</span>
                <span className="text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200 text-[10px]">
                  Realistic Demonstration Data
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Development Intelligence Dashboard
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Aggregated civic demand volume, severity mapping, recent trends and ground evidence.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRebuild}
                disabled={isRebuilding}
                className="text-xs px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Recalculate deterministic priorities from MongoDB"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRebuilding ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Recalculate Priorities</span>
              </button>

              <Link
                href="/report"
                className="text-xs px-3 py-1.5 rounded bg-indigo-700 hover:bg-indigo-800 text-white font-semibold transition-colors flex items-center gap-1"
              >
                <span>+ Report Issue</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Overview KPI Row (ONS / Public Sector Style) */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Total Reports</span>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight mt-1.5">
                {data.kpis.totalReports.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Across 10 civic categories
              </div>
            </div>

            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>High-Priority Issues</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-3xl font-black text-rose-700 tracking-tight mt-1.5">
                {data.kpis.highPriorityCount}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Priority Score ≥ 80.0 / 100
              </div>
            </div>

            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Affected Localities</span>
                <MapPin className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight mt-1.5">
                {data.kpis.affectedLocalitiesCount}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Wards 1 through 25
              </div>
            </div>

            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Reports This Month</span>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight mt-1.5">
                {data.kpis.reportsThisMonth.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Active 28-day cycle
              </div>
            </div>
          </section>

          {/* TOP PRIORITY ISSUES (Table / List Hierarchy - NOT 49 big cards) */}
          <section className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Top Priority Issues</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {displayedClusters.length} of {allClusters.length} issues
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ordered strictly by deterministic score: 30% Demand · 25% Severity · 20% Trend · 15% Geo · 10% Evidence
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center rounded border border-slate-300 p-0.5 bg-slate-50 text-xs">
                  {["all", "High", "Medium", "Low"].map((level) => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                        selectedLevel === level
                          ? "bg-white text-slate-900 font-bold shadow-2xs border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {level === "all" ? "All" : level}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="text-xs rounded border border-slate-300 bg-white px-2 py-1 text-slate-700 focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Structured Table of Top Priority Issues */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider bg-slate-50/70">
                    <th className="py-2.5 px-3">Issue & Category</th>
                    <th className="py-2.5 px-3">Ward / Area</th>
                    <th className="py-2.5 px-3 text-right">Reports</th>
                    <th className="py-2.5 px-3 text-right">Trend</th>
                    <th className="py-2.5 px-3">Evidence</th>
                    <th className="py-2.5 px-3 text-right">Priority Score</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayedClusters.map((cluster) => {
                    const trend = cluster.evidence?.trendPercent ?? 0;
                    const isPositiveTrend = trend > 0;

                    return (
                      <tr
                        key={cluster._id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          cluster.priorityLevel === "High"
                            ? "bg-rose-50/30 font-medium"
                            : ""
                        }`}
                      >
                        {/* Issue & Category */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 text-xs">
                            {cluster.title}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-semibold text-slate-700">
                              {cluster.category}
                            </span>
                            <span>·</span>
                            <span>{cluster.subcategory}</span>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-700">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {cluster.wardIds.join(", ") || "General"}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {cluster.evidence?.affectedLocalities ?? 1} spots
                          </span>
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
                                {cluster.evidence.photoEvidenceCount} photos
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">
                                Text reports
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
                              {cluster.priorityLevel}
                            </span>
                          </div>
                        </td>

                        {/* Action Link */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <Link
                            href={`/dashboard/priorities/${cluster._id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                          >
                            <span>View Evidence</span>
                            <ChevronRight className="w-3 h-3 text-slate-500" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Toggle to expand/collapse full list */}
            {filteredClusters.length > 5 && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Showing {displayedClusters.length} of {filteredClusters.length} issues
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllClusters(!showAllClusters)}
                  className="font-bold text-indigo-700 hover:text-indigo-800 cursor-pointer"
                >
                  {showAllClusters
                    ? "Show Top 5 Only ↑"
                    : `View all ${filteredClusters.length} issues →`}
                </button>
              </div>
            )}
          </section>

          {/* Analytical Charts: Trend & Category Distribution */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Trend over time */}
            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Grievance Ingestion Trend (Last 28 Days)</span>
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily complaint filings identifying active surges
                </p>
              </div>

              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.trendTimeline}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="govTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val) => val.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderRadius: "4px",
                        color: "#fff",
                        fontSize: "11px",
                      }}
                      formatter={(val: unknown) => [typeof val === "number" ? `${val} reports` : String(val), "Volume"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#govTrendGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Category Distribution */}
            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Complaint Volume by Civic Category</span>
                  <Layers className="w-4 h-4 text-slate-400" />
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Relative demand volume across all 10 civic areas
                </p>
              </div>

              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.categoryDistribution}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      dataKey="category"
                      type="category"
                      width={110}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderRadius: "4px",
                        color: "#fff",
                        fontSize: "11px",
                      }}
                      formatter={(val: unknown) => [typeof val === "number" ? `${val} reports` : String(val), "Volume"]}
                    />
                    <Bar
                      dataKey="count"
                      fill="#4f46e5"
                      radius={[0, 2, 2, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </main>
      ) : null}

      <Footer />
    </div>
  );
}
