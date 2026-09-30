import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { IssueCluster } from "@/models/IssueCluster";
import { Complaint } from "@/models/Complaint";
import { Review } from "@/models/Review";
import { PRIORITY_CONFIG } from "@/lib/priority";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;

    if (!id || id.length !== 24) {
      return NextResponse.json(
        { success: false, error: "Invalid issue cluster identifier." },
        { status: 400 }
      );
    }

    const cluster = await IssueCluster.findById(id).lean();
    if (!cluster) {
      return NextResponse.json(
        { success: false, error: "Issue cluster not found." },
        { status: 404 }
      );
    }

    // 1. Fetch complaints belonging to this cluster
    const complaints = await Complaint.find({
      _id: { $in: cluster.complaintIds },
    })
      .sort({ createdAt: -1 })
      .select("rawText language severity location imageUrl imageUrls createdAt")
      .lean();

    // 2. Derive locality distribution breakdown
    const localityCounts: Record<string, number> = {};
    for (const c of complaints) {
      const loc = (c.location || "General Area").trim();
      localityCounts[loc] = (localityCounts[loc] || 0) + 1;
    }

    const localityBreakdown = Object.entries(localityCounts)
      .map(([locality, count]) => ({
        locality,
        count,
        share: cluster.reportCount > 0
          ? Number(((count / cluster.reportCount) * 100).toFixed(1))
          : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 3. Five-factor score breakdown
    const ev = cluster.evidence;
    const w = PRIORITY_CONFIG.weights;

    const demandScore = ev?.demandVolumeScore ?? cluster.reportCount;
    const severityScore = ev?.severityScore ?? cluster.severityScore;
    const trendScore = ev?.trendScore ?? cluster.trendScore;
    const geoScore = ev?.geographicScore ?? cluster.geographicScore;
    const evidenceScore = ev?.evidenceScore ?? cluster.evidenceScore;

    const demandContrib = Number((demandScore * w.demandVolume).toFixed(2));
    const severityContrib = Number((severityScore * w.severity).toFixed(2));
    const trendContrib = Number((trendScore * w.recentTrend).toFixed(2));
    const geoContrib = Number((geoScore * w.geographicConcentration).toFixed(2));
    const evidenceContrib = Number((evidenceScore * w.evidenceStrength).toFixed(2));

    const highCriticalCount =
      (ev?.severityBreakdown?.critical ?? 0) + (ev?.severityBreakdown?.high ?? 0);

    const scoreBreakdown = [
      {
        factor: "Demand Volume",
        weightPercent: 30,
        rawEvidence: `${cluster.reportCount} total reports filed by citizens`,
        normalizedScore: Number(demandScore.toFixed(1)),
        calculation: `${demandScore.toFixed(1)} × 30%`,
        weightedContribution: Number(demandContrib.toFixed(1)),
      },
      {
        factor: "Severity",
        weightPercent: 25,
        rawEvidence: `${ev?.severityBreakdown?.critical ?? 0} critical, ${ev?.severityBreakdown?.high ?? 0} high, ${ev?.severityBreakdown?.medium ?? 0} med, ${ev?.severityBreakdown?.low ?? 0} low`,
        normalizedScore: Number(severityScore.toFixed(1)),
        calculation: `${severityScore.toFixed(1)} × 25%`,
        weightedContribution: Number(severityContrib.toFixed(1)),
      },
      {
        factor: "Recent Trend",
        weightPercent: 20,
        rawEvidence: `${ev?.recentCount ?? 0} recent (14d) vs ${ev?.previousCount ?? 0} previous (15-28d) [${(ev?.trendPercent ?? 0) > 0 ? "+" : ""}${ev?.trendPercent ?? 0}%]`,
        normalizedScore: Number(trendScore.toFixed(1)),
        calculation: `${trendScore.toFixed(1)} × 20%`,
        weightedContribution: Number(trendContrib.toFixed(1)),
      },
      {
        factor: "Geographic Concentration",
        weightPercent: 15,
        rawEvidence: `${localityBreakdown.length} affected localities (dominant: ${localityBreakdown[0]?.locality || "N/A"})`,
        normalizedScore: Number(geoScore.toFixed(1)),
        calculation: `${geoScore.toFixed(1)} × 15%`,
        weightedContribution: Number(geoContrib.toFixed(1)),
      },
      {
        factor: "Evidence Strength",
        weightPercent: 10,
        rawEvidence: `${ev?.photoEvidenceCount ?? 0} photo submissions, ${localityBreakdown.length} verified localities, ${highCriticalCount} urgent alerts`,
        normalizedScore: Number(evidenceScore.toFixed(1)),
        calculation: `${evidenceScore.toFixed(1)} × 10%`,
        weightedContribution: Number(evidenceContrib.toFixed(1)),
      },
    ];

    // 4. Temporal window comparison
    const recentCount = ev?.recentCount ?? 0;
    const previousCount = ev?.previousCount ?? 0;
    const olderCount = Math.max(0, cluster.reportCount - (recentCount + previousCount));

    const temporalComparison = {
      recent14d: recentCount,
      previous14d: previousCount,
      olderThan28d: olderCount,
      trendPercent: ev?.trendPercent ?? 0,
      isIncreasing: (ev?.trendPercent ?? 0) > 0,
    };

    // 5. Canonical Human Review retrieval
    const latestReview = await Review.findOne({ clusterId: cluster._id })
      .sort({ reviewedAt: -1, createdAt: -1 })
      .lean();

    let canonicalReview: {
      _id?: string;
      clusterId?: string;
      decision: "accept" | "adjust" | "reject";
      note: string;
      adjustedPriorityLevel?: "high" | "medium" | "low";
      reviewedAt?: string;
    } | null = null;

    if (latestReview && latestReview.decision) {
      canonicalReview = {
        _id: latestReview._id?.toString(),
        clusterId: id,
        decision: latestReview.decision,
        note: latestReview.note || "",
        adjustedPriorityLevel: latestReview.adjustedPriorityLevel,
        reviewedAt: latestReview.reviewedAt ? new Date(latestReview.reviewedAt).toISOString() : undefined,
      };
    } else if (cluster.review && cluster.review.decision) {
      canonicalReview = {
        clusterId: id,
        decision: cluster.review.decision,
        note: cluster.review.note || "",
        adjustedPriorityLevel: cluster.review.adjustedPriorityLevel,
        reviewedAt: cluster.review.reviewedAt ? new Date(cluster.review.reviewedAt).toISOString() : undefined,
      };
    }

    const responseCluster = {
      ...cluster,
      review: canonicalReview,
      officialDecision: canonicalReview
        ? canonicalReview.decision === "accept"
          ? "approved_for_action"
          : canonicalReview.decision === "adjust"
          ? "approved_for_action"
          : "deferred"
        : "pending_review",
    };

    return NextResponse.json({
      success: true,
      cluster: responseCluster,
      review: canonicalReview,
      scoreBreakdown,
      localityBreakdown,
      temporalComparison,
      sampleComplaints: complaints.slice(0, 30),
      totalComplaintsCount: complaints.length,
      datasetInfo: {
        label: "Realistic Demonstration Data",
        isSynthetic: true,
      },
    });
  } catch (error: unknown) {
    console.error("[GET /api/priorities/:id] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve priority cluster." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const { officialDecision } = body;
    const allowedDecisions = [
      "pending_review",
      "approved_for_action",
      "in_progress",
      "deferred",
      "resolved",
    ];

    if (officialDecision && !allowedDecisions.includes(officialDecision)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid decision. Allowed values: ${allowedDecisions.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const updated = await IssueCluster.findByIdAndUpdate(
      id,
      {
        $set: {
          officialDecision: officialDecision || "pending_review",
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Issue cluster not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      cluster: updated,
    });
  } catch (error: unknown) {
    console.error("[PATCH /api/priorities/:id] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update review decision." },
      { status: 500 }
    );
  }
}
