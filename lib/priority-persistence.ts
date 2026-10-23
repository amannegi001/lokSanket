import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { IssueCluster, IIssueCluster } from "@/models/IssueCluster";
import {
  processComplaintsPipeline,
  classifyPriority,
  CalculatedClusterData,
  calculateClusterPriority,
} from "./priority";
import {
  extractWard,
  formatClusterTitle,
  normalizeString,
  RawClusterGroup,
} from "./clustering";

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

export interface AssignComplaintResult {
  success: boolean;
  cluster: IIssueCluster;
  isNewCluster: boolean;
  complaintId: string;
}

/**
 * Assigns a single complaint to its matching ward-level issue cluster
 * (Category + Subcategory + Ward) and deterministically recalculates
 * the affected cluster's priority metrics.
 *
 * If no matching cluster exists, a new cluster is created.
 * Preserves existing human review decisions and official decision states.
 */
export async function assignComplaintToClusterAndRecalculate(
  complaintId: string | mongoose.Types.ObjectId,
  referenceDate?: Date
): Promise<AssignComplaintResult> {
  await connectDB();

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new Error(`Complaint not found: ${String(complaintId)}`);
  }

  const category = complaint.category?.trim() || "General Civic Issue";
  const subcategory = complaint.subcategory?.trim() || "General Grievance";
  const ward = extractWard(complaint.location, complaint.rawText);

  const normCat = normalizeString(category);
  const normSub = normalizeString(subcategory);
  const normWard = normalizeString(ward);
  const clusterKey = `${normCat}:::${normSub}:::${normWard}`;
  const clusterTitle = formatClusterTitle(category, subcategory, ward);

  // 1. Locate matching cluster
  // Strictly enforce ward boundary: cluster must belong to the exact same ward
  const existingClustersInWard = await IssueCluster.find({ wardIds: ward });
  const matchingCluster = existingClustersInWard.find((c) => {
    const cCat = normalizeString(c.category);
    const cSub = normalizeString(c.subcategory);
    const cWard = normalizeString(c.wardIds?.[0] || ward);
    const key = `${cCat}:::${cSub}:::${cWard}`;
    return key === clusterKey || c.title.trim().toLowerCase() === clusterTitle.trim().toLowerCase();
  });

  // Query highest report count in the database for log-scale demand volume normalization
  const maxCluster = await IssueCluster.findOne().sort({ reportCount: -1 }).select("reportCount").lean();
  const currentMax = maxCluster?.reportCount || 100;

  const effectiveRefDate =
    referenceDate ??
    (process.env.PRIORITY_REFERENCE_DATE
      ? new Date(process.env.PRIORITY_REFERENCE_DATE)
      : new Date());

  let clusterDoc: IIssueCluster;
  let isNewCluster = false;

  if (matchingCluster) {
    // Prevent duplicate complaint IDs
    const cIdStr = complaint._id.toString();
    const existingIds = matchingCluster.complaintIds.map((id) => id.toString());
    if (!existingIds.includes(cIdStr)) {
      matchingCluster.complaintIds.push(complaint._id);
    }

    // Fetch all complaints belonging to this cluster to recalculate exact evidence & priority
    const allComplaints = await Complaint.find({
      _id: { $in: matchingCluster.complaintIds },
    });

    const maxReportCount = Math.max(currentMax, allComplaints.length);
    const rawGroup: RawClusterGroup = {
      clusterKey,
      title: matchingCluster.title || clusterTitle,
      category: matchingCluster.category || category,
      subcategory: matchingCluster.subcategory || subcategory,
      wardIds: matchingCluster.wardIds?.length ? matchingCluster.wardIds : [ward],
      complaints: allComplaints,
    };

    const calculated = calculateClusterPriority(rawGroup, maxReportCount, effectiveRefDate);
    const level = classifyPriority(calculated.priorityScore);

    matchingCluster.reportCount = allComplaints.length;
    matchingCluster.severityScore = calculated.severityScore;
    matchingCluster.trendScore = calculated.trendScore;
    matchingCluster.geographicScore = calculated.geographicScore;
    matchingCluster.evidenceScore = calculated.evidenceScore;
    matchingCluster.priorityScore = calculated.priorityScore;
    matchingCluster.priorityLevel = level;
    matchingCluster.evidence = calculated.evidence;
    matchingCluster.updatedAt = new Date();

    // Preserve existing human review & official decision
    if (!matchingCluster.officialDecision) {
      matchingCluster.officialDecision = "pending_review";
    }

    clusterDoc = await matchingCluster.save();
  } else {
    isNewCluster = true;
    const maxReportCount = Math.max(currentMax, 1);
    const rawGroup: RawClusterGroup = {
      clusterKey,
      title: clusterTitle,
      category,
      subcategory,
      wardIds: [ward],
      complaints: [complaint],
    };

    const calculated = calculateClusterPriority(rawGroup, maxReportCount, effectiveRefDate);
    const level = classifyPriority(calculated.priorityScore);

    clusterDoc = await IssueCluster.create({
      title: clusterTitle,
      category,
      subcategory,
      wardIds: [ward],
      complaintIds: [complaint._id],
      reportCount: 1,
      severityScore: calculated.severityScore,
      trendScore: calculated.trendScore,
      geographicScore: calculated.geographicScore,
      evidenceScore: calculated.evidenceScore,
      priorityScore: calculated.priorityScore,
      priorityLevel: level,
      evidence: calculated.evidence,
      aiExplanation: `Deterministic Priority: ${calculated.priorityScore}/100 (${level}). 1 report in ${category} in ${ward}.`,
      officialDecision: "pending_review",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Update complaint with assigned clusterId and status: "clustered"
  complaint.clusterId = clusterDoc._id;
  complaint.status = "clustered";
  await complaint.save();

  return {
    success: true,
    cluster: clusterDoc,
    isNewCluster,
    complaintId: complaint._id.toString(),
  };
}
