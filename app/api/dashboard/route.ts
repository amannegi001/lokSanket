import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { IssueCluster } from "@/models/IssueCluster";

export async function GET() {
  try {
    await connectDB();

    // 1. Calculate high-level KPIs from actual MongoDB data
    const totalReports = await Complaint.countDocuments();
    const totalClusters = await IssueCluster.countDocuments();
    const highPriorityCount = await IssueCluster.countDocuments({
      priorityLevel: "High",
    });
    const mediumPriorityCount = await IssueCluster.countDocuments({
      priorityLevel: "Medium",
    });
    const lowPriorityCount = await IssueCluster.countDocuments({
      priorityLevel: "Low",
    });

    const distinctLocalities = await Complaint.distinct("location");
    const affectedLocalitiesCount = distinctLocalities.filter(Boolean).length;

    // Reports in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const reportsThisMonth = await Complaint.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // 2. Aggregate category distribution from complaints
    const categoryAgg = await Complaint.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const categoryDistribution = categoryAgg.map((item) => ({
      category: item._id || "Uncategorized",
      count: item.count,
    }));

    // 3. Aggregate trend timeline (daily counts across last 28 days)
    const timelineAgg = await Complaint.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const trendTimeline = timelineAgg.map((item) => ({
      date: item._id,
      count: item.count,
    }));

    // 4. Fetch Top Priority Clusters sorted by deterministic priority score
    const topClusters = await IssueCluster.find()
      .sort({ priorityScore: -1, reportCount: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalReports,
          totalClusters,
          highPriorityCount,
          mediumPriorityCount,
          lowPriorityCount,
          affectedLocalitiesCount,
          reportsThisMonth,
        },
        categoryDistribution,
        trendTimeline,
        topClusters,
        datasetInfo: {
          isSynthetic: true,
          label: "Realistic Demonstration Data",
          constituency: "Demo Constituency #17",
          disclaimer:
            "AI-generated insights are decision-support recommendations and should be verified against available evidence before action.",
        },
      },
    });
  } catch (error: unknown) {
    console.error("[GET /api/dashboard] Error fetching dashboard data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate dashboard intelligence summary.",
      },
      { status: 500 }
    );
  }
}
