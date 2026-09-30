import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { IssueCluster } from "@/models/IssueCluster";
import { Review } from "@/models/Review";
import { sanitizeLocality } from "@/lib/clustering";

export async function GET() {
  try {
    await connectDB();

    // 1. Fetch high-level KPIs, cluster summary, recent reports, and canonical reviews from MongoDB
    const [
      totalReports,
      clusters,
      reviews,
      distinctLocalities,
      reportsThisMonth,
      categoryAgg,
      timelineAgg,
      recentComplaints,
    ] = await Promise.all([
      // A. Total complaint documents
      Complaint.countDocuments(),

      // B. All IssueClusters sorted deterministically by priorityScore DESC, reportCount DESC
      IssueCluster.find()
        .sort({ priorityScore: -1, reportCount: -1 })
        .lean(),

      // C. All canonical official reviews
      Review.find().sort({ reviewedAt: -1, createdAt: -1 }).lean(),

      // D. Distinct affected localities
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

      // G. Latest 5 complaints for Recent Citizen Reports
      Complaint.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("category subcategory severity location createdAt clusterId")
        .lean(),
    ]);

    // Format recent citizen reports safely without exposing full addresses or raw text
    const recentReports = (recentComplaints || []).map((c) => ({
      _id: c._id.toString(),
      category: c.category || "General Civic Issue",
      subcategory: c.subcategory || "General Grievance",
      severity: c.severity || "medium",
      location: sanitizeLocality(c.location),
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      clusterId: c.clusterId ? c.clusterId.toString() : null,
    }));

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

    // Map canonical reviews by clusterId
    const reviewByClusterId = new Map<string, typeof reviews[0]>();
    for (const r of reviews) {
      const cId = r.clusterId?.toString();
      if (cId && !reviewByClusterId.has(cId)) {
        reviewByClusterId.set(cId, r);
      }
    }

    // Attach canonical review to each cluster
    const clustersWithReviews = clusters.map((c) => {
      const cId = c._id.toString();
      const canonicalReview = reviewByClusterId.get(cId);

      if (canonicalReview && canonicalReview.decision) {
        return {
          ...c,
          officialDecision:
            canonicalReview.decision === "accept"
              ? "approved_for_action"
              : canonicalReview.decision === "adjust"
              ? "approved_for_action"
              : "deferred",
          review: {
            _id: canonicalReview._id?.toString(),
            clusterId: cId,
            decision: canonicalReview.decision,
            note: canonicalReview.note || "",
            adjustedPriorityLevel: canonicalReview.adjustedPriorityLevel,
            reviewedAt: canonicalReview.reviewedAt
              ? new Date(canonicalReview.reviewedAt).toISOString()
              : undefined,
          },
        };
      }

      if (c.review && c.review.decision) {
        return {
          ...c,
          review: {
            decision: c.review.decision,
            note: c.review.note || "",
            adjustedPriorityLevel: c.review.adjustedPriorityLevel,
            reviewedAt: c.review.reviewedAt
              ? new Date(c.review.reviewedAt).toISOString()
              : undefined,
          },
        };
      }

      // No actual human review decision exists
      return {
        ...c,
        officialDecision: "pending_review",
        review: null,
      };
    });

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
        topClusters: clustersWithReviews.slice(0, 10),
        clusters: clustersWithReviews, // Full set of sorted clusters for instant frontend filtering
        recentReports,
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
