import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { IssueCluster } from "@/models/IssueCluster";

export async function GET() {
  try {
    await connectDB();

    // 1. Fetch high-level KPIs and cluster summary from actual MongoDB records
    const [
      totalReports,
      clusters,
      distinctLocalities,
      reportsThisMonth,
      categoryAgg,
      timelineAgg,
    ] = await Promise.all([
      // A. Total complaint documents
      Complaint.countDocuments(),

      // B. All IssueClusters sorted deterministically by priorityScore DESC, reportCount DESC
      IssueCluster.find()
        .sort({ priorityScore: -1, reportCount: -1 })
        .lean(),

      // C. Distinct affected localities
      Complaint.distinct("location"),

      // D. Reports in active month cycle (last 30 days)
      Complaint.countDocuments({
        createdAt: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      }),

      // E. Category distribution directly from complaints
      Complaint.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // F. Trend timeline (daily counts across the last 28 days)
      Complaint.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Priority level counts derived directly from stored clusters
    const highPriorityCount = clusters.filter(
      (c) => c.priorityLevel === "High"
    ).length;
    const mediumPriorityCount = clusters.filter(
      (c) => c.priorityLevel === "Medium"
    ).length;
    const lowPriorityCount = clusters.filter(
      (c) => c.priorityLevel === "Low"
    ).length;

    const affectedLocalitiesCount = distinctLocalities.filter(Boolean).length;

    // Format category distribution
    const categoryDistribution = categoryAgg.map((item) => ({
      category: item._id || "Uncategorized",
      count: item.count,
    }));

    // Format trend timeline
    const trendTimeline = timelineAgg.map((item) => ({
      date: item._id,
      count: item.count,
    }));

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalReports,
          totalClusters: clusters.length,
          highPriorityCount,
          mediumPriorityCount,
          lowPriorityCount,
          affectedLocalitiesCount,
          reportsThisMonth,
        },
        categoryDistribution,
        trendTimeline,
        topClusters: clusters.slice(0, 10),
        clusters, // Full set of sorted clusters for instant frontend filtering
        datasetInfo: {
          isSynthetic: true,
          label: "Realistic Demonstration Data",
          constituency: "Central Demonstration Constituency (Ward 1–25)",
          disclaimer:
            "Civic intelligence generated from realistic demonstration complaint records for development decision support.",
        },
      },
    });
  } catch (error: unknown) {
    console.error("[GET /api/dashboard] Error fetching dashboard data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate dashboard intelligence summary from database.",
      },
      { status: 500 }
    );
  }
}
