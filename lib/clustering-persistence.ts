import { connectDB } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { IssueCluster, IClusterEvidence, IIssueCluster } from "@/models/IssueCluster";
import {
  groupComplaintsIntoClusters,
  calculateClusterEvidence,
  RebuildClusteringResult,
} from "./clustering";

/**
 * Rebuilds all IssueCluster records idempotently from current Complaint records.
 * Running this multiple times will never produce duplicate records.
 */
export async function rebuildIssueClusters(
  referenceDate: Date = new Date()
): Promise<RebuildClusteringResult> {
  await connectDB();

  // 1. Fetch all complaints
  const complaints = await Complaint.find().sort({ createdAt: -1 });

  if (complaints.length === 0) {
    return {
      success: false,
      totalComplaintsProcessed: 0,
      totalClustersCreated: 0,
      largestClusters: [],
      ward17RoadCluster: null,
    };
  }

  // 2. Group complaints into raw clusters
  const rawClusters = groupComplaintsIntoClusters(complaints);

  // 3. Clear existing issue clusters to guarantee idempotence (no duplicates)
  await IssueCluster.deleteMany({});

  // 4. Calculate traceable evidence and prepare cluster documents
  const createdClusterDocs: IIssueCluster[] = [];

  for (const raw of rawClusters) {
    const stats = calculateClusterEvidence(raw.complaints, referenceDate);

    // Schema requires evidence structure; placeholder priority scores are stored
    // until the deterministic priority engine milestone
    const evidence: IClusterEvidence = {
      reportCount: stats.reportCount,
      affectedLocalities: stats.affectedLocalities,
      localities: stats.localities,
      photoEvidenceCount: stats.photoEvidenceCount,
      trendPercent: stats.trendPercent,
      recentCount: stats.recentCount,
      previousCount: stats.previousCount,
      severityBreakdown: stats.severityBreakdown,
      affectedGroups: stats.affectedGroups,
      // Placeholders for priority scoring milestone
      demandVolumeScore: 0,
      severityScore: 0,
      trendScore: 0,
      geographicScore: Math.round(stats.geographicHHI * 100),
      evidenceScore: 0,
      priorityScore: 0,
    };

    const clusterDoc = await IssueCluster.create({
      title: raw.title,
      category: raw.category,
      subcategory: raw.subcategory,
      wardIds: raw.wardIds,
      complaintIds: raw.complaints.map((c) => c._id),
      reportCount: stats.reportCount,
      // Priority placeholders
      severityScore: 0,
      trendScore: 0,
      geographicScore: Math.round(stats.geographicHHI * 100),
      evidenceScore: 0,
      priorityScore: 0,
      priorityLevel: "Low",
      evidence,
      aiExplanation: `Issue cluster of ${stats.reportCount} complaints in ${raw.category} across ${stats.affectedLocalities} localities in ${raw.wardIds.join(", ")}.`,
      officialDecision: "pending_review",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    createdClusterDocs.push(clusterDoc);

    // 5. Update complaints with assigned clusterId and status: "clustered"
    const complaintIds = raw.complaints.map((c) => c._id);
    await Complaint.updateMany(
      { _id: { $in: complaintIds } },
      { $set: { clusterId: clusterDoc._id, status: "clustered" } }
    );
  }

  // 6. Sort clusters by report count descending
  createdClusterDocs.sort((a, b) => b.reportCount - a.reportCount);

  // 7. Find specific Ward 17 Road Infrastructure cluster
  const ward17RoadDoc = createdClusterDocs.find(
    (c) =>
      c.category === "Road Infrastructure" &&
      c.wardIds.includes("Ward 17") &&
      c.subcategory.toLowerCase().includes("pothole")
  );

  let ward17RoadCluster = null;
  if (ward17RoadDoc) {
    const highOrCriticalCount =
      (ward17RoadDoc.evidence.severityBreakdown.high || 0) +
      (ward17RoadDoc.evidence.severityBreakdown.critical || 0);

    ward17RoadCluster = {
      clusterId: String(ward17RoadDoc._id),
      title: ward17RoadDoc.title,
      category: ward17RoadDoc.category,
      ward: ward17RoadDoc.wardIds[0] || "Ward 17",
      reportCount: ward17RoadDoc.reportCount,
      affectedLocalitiesCount: ward17RoadDoc.evidence.affectedLocalities,
      localities: ward17RoadDoc.evidence.localities,
      photoEvidenceCount: ward17RoadDoc.evidence.photoEvidenceCount,
      highOrCriticalCount,
      recentCount: ward17RoadDoc.evidence.recentCount,
      previousCount: ward17RoadDoc.evidence.previousCount,
      trendPercent: ward17RoadDoc.evidence.trendPercent,
      complaintIdsCount: ward17RoadDoc.complaintIds.length,
    };
  }

  const largestClusters = createdClusterDocs.slice(0, 10).map((c) => ({
    clusterId: String(c._id),
    title: c.title,
    category: c.category,
    ward: c.wardIds[0] || "General",
    reportCount: c.reportCount,
    affectedLocalities: c.evidence.affectedLocalities,
    photoCount: c.evidence.photoEvidenceCount,
    trendPercent: c.evidence.trendPercent,
  }));

  return {
    success: true,
    totalComplaintsProcessed: complaints.length,
    totalClustersCreated: createdClusterDocs.length,
    largestClusters,
    ward17RoadCluster,
  };
}
