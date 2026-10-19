import { connectDB } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { IssueCluster } from "@/models/IssueCluster";
import {
  processComplaintsPipeline,
  classifyPriority,
  CalculatedClusterData,
} from "./priority";

/**
 * Connects to MongoDB, processes all complaints, updates/persists
 * priority scores on all IssueCluster records, and links complaints.
 * 
 * Preserves existing cluster ObjectIds, official reviews, and human decisions.
 */
export async function recalculateAndPersistPriorities(
  referenceDate?: Date
): Promise<{
  success: boolean;
  totalClustersUpdated: number;
  rankedClusters: CalculatedClusterData[];
  ward17RoadCluster: CalculatedClusterData | null;
}> {
  await connectDB();

  const complaints = await Complaint.find().sort({ createdAt: -1 });
  if (complaints.length === 0) {
    return {
      success: false,
      totalClustersUpdated: 0,
      rankedClusters: [],
      ward17RoadCluster: null,
    };
  }

  // Anchor temporal window to referenceDate, env variable, or 2026-09-30 demonstration baseline
  const effectiveRefDate =
    referenceDate ??
    (process.env.PRIORITY_REFERENCE_DATE
      ? new Date(process.env.PRIORITY_REFERENCE_DATE)
      : new Date("2026-09-30T10:00:00.000Z"));

  const calculatedClusters = processComplaintsPipeline(complaints, effectiveRefDate);

  // Fetch existing clusters to preserve officialDecision, human reviews, and ObjectIds
  const existingClusters = await IssueCluster.find();
  const existingClusterByKey = new Map<string, typeof existingClusters[0]>();
  for (const ec of existingClusters) {
    const key = `${(ec.category || "").trim().toLowerCase()}:::${(ec.subcategory || "").trim().toLowerCase()}:::${(ec.wardIds?.[0] || "").trim().toLowerCase()}`;
    existingClusterByKey.set(key, ec);
    existingClusterByKey.set(ec.title.trim().toLowerCase(), ec);
  }

  const updatedClusterIds = new Set<string>();

  for (const cData of calculatedClusters) {
    const key = `${cData.category.trim().toLowerCase()}:::${cData.subcategory.trim().toLowerCase()}:::${(cData.wardIds?.[0] || "").trim().toLowerCase()}`;
    const existing = existingClusterByKey.get(key) || existingClusterByKey.get(cData.title.trim().toLowerCase());
    const level = classifyPriority(cData.priorityScore);

    let clusterDoc;
    if (existing) {
      existing.title = cData.title;
      existing.category = cData.category;
      existing.subcategory = cData.subcategory;
      existing.wardIds = cData.wardIds;
      existing.complaintIds = cData.complaintIds as unknown as typeof existing.complaintIds;
      existing.reportCount = cData.reportCount;
      existing.severityScore = cData.severityScore;
      existing.trendScore = cData.trendScore;
      existing.geographicScore = cData.geographicScore;
      existing.evidenceScore = cData.evidenceScore;
      existing.priorityScore = cData.priorityScore;
      existing.priorityLevel = level;
      existing.evidence = cData.evidence;
      existing.aiExplanation = `Deterministic Priority: ${cData.priorityScore}/100 (${level}). ${cData.reportCount} reports across ${cData.evidence.affectedLocalities} localities in ${cData.wardIds.join(", ")}.`;
      if (!existing.officialDecision) {
        existing.officialDecision = "pending_review";
      }
      existing.updatedAt = new Date();
      clusterDoc = await existing.save();
    } else {
      clusterDoc = await IssueCluster.create({
        title: cData.title,
        category: cData.category,
        subcategory: cData.subcategory,
        wardIds: cData.wardIds,
        complaintIds: cData.complaintIds,
        reportCount: cData.reportCount,
        severityScore: cData.severityScore,
        trendScore: cData.trendScore,
        geographicScore: cData.geographicScore,
        evidenceScore: cData.evidenceScore,
        priorityScore: cData.priorityScore,
        priorityLevel: level,
        evidence: cData.evidence,
        aiExplanation: `Deterministic Priority: ${cData.priorityScore}/100 (${level}). ${cData.reportCount} reports across ${cData.evidence.affectedLocalities} localities in ${cData.wardIds.join(", ")}.`,
        officialDecision: "pending_review",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    updatedClusterIds.add(String(clusterDoc._id));

    // Link complaint documents back to cluster
    await Complaint.updateMany(
      { _id: { $in: cData.complaintIds } },
      { $set: { clusterId: clusterDoc._id, status: "clustered" } }
    );
  }

  // Idempotently clean up only clusters that no longer exist in the calculated set
  await IssueCluster.deleteMany({ _id: { $nin: Array.from(updatedClusterIds) } });

  const ward17RoadCluster =
    calculatedClusters.find(
      (c) =>
        c.category === "Road Infrastructure" &&
        c.wardIds.includes("Ward 17") &&
        c.subcategory.toLowerCase().includes("pothole")
    ) || null;

  return {
    success: true,
    totalClustersUpdated: calculatedClusters.length,
    rankedClusters: calculatedClusters,
    ward17RoadCluster,
  };
}
