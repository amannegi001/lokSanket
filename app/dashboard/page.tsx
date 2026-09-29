"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
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
        setRebuildStatus("Recalculating clusters & priority scores...");
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

  // Filter clusters based on user selections
  const filteredClusters = allClusters.filter((c) => {
    if (selectedLevel !== "all" && c.priorityLevel !== selectedLevel) {
      return false;
    }
    if (selectedCategory !== "all" && c.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const uniqueCategories = Array.from(
    new Set(allClusters.map((c) => c.category))
  ).sort();

  const getPriorityBadgeStyles = (level: string) => {
    switch (level) {
      case "High":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900";
      case "Low":
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800";
    }
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return "bg-rose-600";
    if (score >= 60) return "bg-amber-500";
    return "bg-blue-600";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans pb-16">
      {/* Top Banner: Synthetic Demonstration Data Disclaimer */}
      <aside aria-label="Demonstration Notice" className="bg-amber-50 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-900 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 text-[10px]">
              Realistic Demonstration Data
            </span>
            <span>
              All grievances shown are synthetic data generated for constituency decision support simulation.
            </span>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 italic">
            AI-generated insights are decision-support recommendations and should be verified against available evidence before action.
          </p>
        </div>
      </aside>

      {/* Main Navigation Bar */}
      <header className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-400">
                लोकसंकेत
              </span>
              <span className="text-xs uppercase font-bold tracking-widest text-slate-500 dark:text-zinc-400 border-l border-slate-200 dark:border-zinc-800 pl-3">
                Constituency Intelligence
              </span>
            </div>
            <span className="hidden md:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
              Demo Constituency #17
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRebuild}
              disabled={isRebuilding}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Recalculate deterministic priorities from MongoDB"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRebuilding ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Recalculate Priorities</span>
            </button>

            <Link
              href="/"
              className="text-xs px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors flex items-center gap-1.5"
            >
              <span>+ New Citizen Grievance</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Rebuild notification banner */}
      {rebuildStatus && (
        <div className="bg-emerald-50 dark:bg-emerald-950 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs py-2 text-center font-medium animate-in fade-in">
          {rebuildStatus}
        </div>
      )}

      {loading && !data ? (
        <main className="max-w-7xl mx-auto px-4 py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
          <h2 className="text-base font-semibold text-slate-700 dark:text-zinc-300">
            Loading Constituency Intelligence Data...
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Grounded directly in MongoDB Atlas complaints & issue clusters.
          </p>
        </main>
      ) : error ? (
        <main className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="inline-block p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-600" />
            <p className="font-semibold">Unable to load dashboard data</p>
            <p className="text-xs mt-1 text-rose-600 dark:text-rose-400">{error}</p>
            <button
              onClick={reloadData}
              className="mt-3 px-3 py-1 bg-rose-600 text-white rounded text-xs cursor-pointer"
            >
              Retry
            </button>
          </div>
        </main>
      ) : data ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Executive Overview Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                Constituency Development Priorities
              </h1>
              <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1">
                Evidence-backed civic issue aggregation and deterministic decision support.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Dataset: <strong>{data.kpis.totalReports} Verified Reports</strong></span>
              <span>·</span>
              <span><strong>{data.kpis.totalClusters} Clusters</strong></span>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1 */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-slate-200 dark:border-zinc-800 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <span>Total Reports</span>
                <FileText className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-zinc-50 mt-2">
                {data.kpis.totalReports.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                <span>Across 10 civic categories</span>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-rose-200 dark:border-rose-950/80 shadow-2xs">
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider">
                <span>High-Priority Issues</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">
                {data.kpis.highPriorityCount}
              </div>
              <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Priority Score ≥ 80.0 / 100
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-slate-200 dark:border-zinc-800 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <span>Affected Localities</span>
                <MapPin className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-zinc-50 mt-2">
                {data.kpis.affectedLocalitiesCount}
              </div>
              <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Wards 1 through 25
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-slate-200 dark:border-zinc-800 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <span>Reports This Month</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-zinc-50 mt-2">
                {data.kpis.reportsThisMonth.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Active 28-day reporting cycle
              </div>
            </div>
          </section>

          {/* Analytical Charts Row */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Civic Category Distribution */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                    Complaint Volume by Civic Category
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Grounded in actual MongoDB complaint classification counts
                  </p>
                </div>
                <Layers className="w-4 h-4 text-slate-400" />
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.categoryDistribution}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="category"
                      type="category"
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                      formatter={(val: unknown) => [typeof val === "number" ? `${val} reports` : String(val), "Volume"]}
                    />
                    <Bar
                      dataKey="count"
                      fill="#059669"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Grievance Ingestion Timeline */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                    Grievance Ingestion Trend (Last 28 Days)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Daily complaint filings capturing emerging surge patterns
                  </p>
                </div>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.trendTimeline}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val) => val.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                      formatter={(val: unknown) => [typeof val === "number" ? `${val} complaints` : String(val), "Reports"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#trendGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Priority Issue Clusters Section */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>Ranked Priority Issue Clusters</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-semibold border border-slate-200 dark:border-zinc-700">
                    {filteredClusters.length} of {allClusters.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Ordered deterministically: 30% Demand · 25% Severity · 20% Trend · 15% Geo · 10% Evidence
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center rounded-lg border border-slate-300 dark:border-zinc-700 p-0.5 bg-white dark:bg-zinc-900 text-xs">
                  {["all", "High", "Medium", "Low"].map((level) => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                        selectedLevel === level
                          ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
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
                    className="text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-slate-700 dark:text-zinc-300 focus:outline-none"
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

            {/* Clusters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredClusters.map((cluster) => {
                const trend = cluster.evidence?.trendPercent ?? 0;
                const isPositiveTrend = trend > 0;

                return (
                  <div
                    key={cluster._id}
                    className={`bg-white dark:bg-zinc-900 rounded-xl border p-5 shadow-2xs flex flex-col justify-between transition-all hover:shadow-md hover:border-slate-400 dark:hover:border-zinc-600 ${
                      cluster.priorityLevel === "High"
                        ? "border-rose-300 dark:border-rose-900/80 ring-1 ring-rose-200 dark:ring-rose-950"
                        : "border-slate-200 dark:border-zinc-800"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${getPriorityBadgeStyles(
                            cluster.priorityLevel
                          )}`}
                        >
                          {cluster.priorityLevel} Priority
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {cluster.wardIds.join(", ") || "Constituency"}
                        </span>
                      </div>

                      {/* Title & Category */}
                      <div>
                        <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                          {cluster.category} · {cluster.subcategory}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 mt-1 line-clamp-2 leading-snug">
                          {cluster.title}
                        </h3>
                      </div>

                      {/* Evidence Metrics Row */}
                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-zinc-800/80 text-center text-xs">
                        <div className="bg-slate-50 dark:bg-zinc-800/40 p-1.5 rounded">
                          <span className="block text-slate-400 text-[10px] uppercase font-semibold">
                            Reports
                          </span>
                          <span className="font-bold text-slate-900 dark:text-zinc-100">
                            {cluster.reportCount}
                          </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-zinc-800/40 p-1.5 rounded">
                          <span className="block text-slate-400 text-[10px] uppercase font-semibold">
                            Localities
                          </span>
                          <span className="font-bold text-slate-900 dark:text-zinc-100">
                            {cluster.evidence?.affectedLocalities ?? 1}
                          </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-zinc-800/40 p-1.5 rounded">
                          <span className="block text-slate-400 text-[10px] uppercase font-semibold">
                            Trend
                          </span>
                          <span
                            className={`font-bold ${
                              isPositiveTrend
                                ? "text-rose-600 dark:text-rose-400"
                                : trend < 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-slate-600"
                            }`}
                          >
                            {isPositiveTrend ? `↑ +${trend}%` : `${trend}%`}
                          </span>
                        </div>
                      </div>

                      {/* Additional evidence indicators */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
                        {cluster.evidence?.photoEvidenceCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5 text-blue-500" />
                            <strong>{cluster.evidence.photoEvidenceCount}</strong> Photos
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          Decision:{" "}
                          <strong className="text-slate-600 dark:text-zinc-300">
                            {cluster.officialDecision.replace(/_/g, " ")}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Footer: Priority Score & Link */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                          Priority Score
                        </span>
                        <span className="font-black text-slate-900 dark:text-zinc-50 text-sm">
                          {cluster.priorityScore.toFixed(1)}{" "}
                          <span className="text-slate-400 text-xs font-normal">
                            / 100
                          </span>
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getScoreBarColor(
                            cluster.priorityScore
                          )}`}
                          style={{
                            width: `${Math.min(100, cluster.priorityScore)}%`,
                          }}
                        />
                      </div>

                      <Link
                        href={`/dashboard/priorities/${cluster._id}`}
                        className="mt-2 w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span>View Evidence & Breakdown</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      ) : null}
    </div>
  );
}
