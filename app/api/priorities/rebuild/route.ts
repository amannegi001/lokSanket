import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { IssueCluster } from "@/models/IssueCluster";
import { processComplaintsPipeline } from "@/lib/priority";

export async function POST() {
  try {
    await connectDB();

    // 1. Fetch all complaints
    const complaints = await Complaint.find().sort({ createdAt: -1 });

    if (complaints.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No complaints found to cluster. Please submit complaints or run the seed script first.",
        },
        { status: 400 }
      );
    }

    // 2. Run deterministic clustering and priority calculation
    const calculatedClusters = processComplaintsPipeline(complaints);

    // 3. Clear existing clusters and rebuild fresh
    await IssueCluster.deleteMany({});

    // 4. Persist newly calculated clusters and link complaints
    const createdClusters = [];
    for (const clusterData of calculatedClusters) {
      const clusterDoc = await IssueCluster.create({
        title: clusterData.title,
        category: clusterData.category,
        subcategory: clusterData.subcategory,
        wardIds: clusterData.wardIds,
        complaintIds: clusterData.complaintIds,
        reportCount: clusterData.reportCount,
        severityScore: clusterData.severityScore,
        trendScore: clusterData.trendScore,
        geographicScore: clusterData.geographicScore,
        evidenceScore: clusterData.evidenceScore,
        priorityScore: clusterData.priorityScore,
        priorityLevel: clusterData.priorityLevel,
        evidence: clusterData.evidence,
        officialDecision: "pending_review",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      createdClusters.push(clusterDoc);

      // Link complaint documents back to this cluster
      await Complaint.updateMany(
        { _id: { $in: clusterData.complaintIds } },
        { $set: { clusterId: clusterDoc._id, status: "clustered" } }
      );
    }

    const highCount = createdClusters.filter((c) => c.priorityLevel === "High").length;
    const medCount = createdClusters.filter((c) => c.priorityLevel === "Medium").length;
    const lowCount = createdClusters.filter((c) => c.priorityLevel === "Low").length;

    return NextResponse.json({
      success: true,
      message: "Issue clusters and priority scores successfully recalculated.",
      totalComplaintsProcessed: complaints.length,
      totalClustersGenerated: createdClusters.length,
      breakdown: {
        high: highCount,
        medium: medCount,
        low: lowCount,
      },
      topClusters: createdClusters.slice(0, 5),
    });
  } catch (error: unknown) {
    console.error("[POST /api/priorities/rebuild] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to recalculate priority clusters.",
      },
      { status: 500 }
    );
  }
}
