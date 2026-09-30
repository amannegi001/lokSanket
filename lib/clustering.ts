import { connectDB } from "@/lib/db";
import { Complaint, IComplaint } from "@/models/Complaint";
import { IssueCluster, IClusterEvidence, IIssueCluster } from "@/models/IssueCluster";

export interface RawClusterGroup {
  clusterKey: string;
  title: string;
  category: string;
  subcategory: string;
  wardIds: string[];
  complaints: IComplaint[];
}

export interface TraceableClusterEvidence {
  reportCount: number;
  affectedLocalities: number;
  localities: string[];
  photoEvidenceCount: number;
  recentCount: number;
  previousCount: number;
  trendPercent: number;
  severityBreakdown: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  affectedGroups: string[];
  geographicHHI: number;
  dominantLocality: string;
  dominantLocalityShare: number;
}

export interface RebuildClusteringResult {
  success: boolean;
  totalComplaintsProcessed: number;
  totalClustersCreated: number;
  largestClusters: Array<{
    clusterId: string;
    title: string;
    category: string;
    ward: string;
    reportCount: number;
    affectedLocalities: number;
    photoCount: number;
    trendPercent: number;
  }>;
  ward17RoadCluster: {
    clusterId: string;
    title: string;
    category: string;
    ward: string;
    reportCount: number;
    affectedLocalitiesCount: number;
    localities: string[];
    photoEvidenceCount: number;
    highOrCriticalCount: number;
    recentCount: number;
    previousCount: number;
    trendPercent: number;
    complaintIdsCount: number;
  } | null;
}

/**
 * Extracts a normalized ward identifier from location or complaint text.
 * E.g., "Ward 17 - Gandhi Nagar" -> "Ward 17"
 *       "वार्ड 17" -> "Ward 17"
 *       "Ward-17" -> "Ward 17"
 */
export function extractWard(location?: string, rawText?: string): string {
  const combined = `${location || ""} ${rawText || ""}`;

  // Match English or Hindi Ward patterns (e.g., "Ward 17", "वार्ड 17", "Ward-17")
  const wardMatch = combined.match(/\b(?:Ward|वार्ड)[-\s]*(\d+)\b/i);
  if (wardMatch && wardMatch[1]) {
    return `Ward ${wardMatch[1]}`;
  }

  // Match Sector patterns if present (e.g., "Sector 4", "सेक्टर 4")
  const sectorMatch = combined.match(/\b(?:Sector|सेक्टर)[-\s]*(\d+)\b/i);
  if (sectorMatch && sectorMatch[1]) {
    return `Sector ${sectorMatch[1]}`;
  }

  if (location && location.trim()) {
    // If locality is provided without explicit ward number, use the first locality segment
    const clean = location.split("-")[0].split(",")[0].trim();
    if (clean.length > 0) return clean;
  }

  return "Constituency General";
}

/**
 * Normalizes string keys for stable canonical grouping.
 */
function normalizeString(str?: string): string {
  return (str || "General")
    .trim()
    .toLowerCase()
    .replace(/[/\-_&]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Generates an intuitive, editorial human-readable cluster title.
 * E.g., "Road Damage & Potholes — Ward 17"
 */
export function formatClusterTitle(
  category: string,
  subcategory: string,
  ward: string
): string {
  let cleanSub = subcategory
    .replace(/\//g, " & ")
    .replace(/\s+/g, " ")
    .trim();

  // Standardize common civic titles
  if (cleanSub.toLowerCase() === "potholes & road damage") {
    cleanSub = "Road Damage & Potholes";
  }

  return `${cleanSub} — ${ward}`;
}

/**
 * Deterministic candidate grouping algorithm.
 * Groups complaints strictly by Category + Subcategory + Primary Geographic Zone (Ward).
 * 
 * Guarantees:
 * - Unrelated categories are never combined.
 * - Distinct subcategories within the same category remain distinct clusters
 *   (e.g., "Potholes / Road Damage" vs. "Minor Surface Erosion" vs. "Waterlogging").
 * - Issues across different wards remain separate clusters.
 */
export function groupComplaintsIntoClusters(
  complaints: IComplaint[]
): RawClusterGroup[] {
  const clustersMap = new Map<string, RawClusterGroup>();

  for (const complaint of complaints) {
    const category = complaint.category?.trim() || "General Civic Issue";
    const subcategory = complaint.subcategory?.trim() || "General Grievance";
    const ward = extractWard(complaint.location, complaint.rawText);

    const normCat = normalizeString(category);
    const normSub = normalizeString(subcategory);
    const normWard = normalizeString(ward);

    // Composite grouping key: Category + Subcategory + Ward
    const clusterKey = `${normCat}:::${normSub}:::${normWard}`;

    let cluster = clustersMap.get(clusterKey);
    if (!cluster) {
      cluster = {
        clusterKey,
        title: formatClusterTitle(category, subcategory, ward),
        category,
        subcategory,
        wardIds: [ward],
        complaints: [],
      };
      clustersMap.set(clusterKey, cluster);
    } else {
      if (!cluster.wardIds.includes(ward)) {
        cluster.wardIds.push(ward);
      }
    }

    cluster.complaints.push(complaint);
  }

  return Array.from(clustersMap.values());
}

/**
 * Calculates traceable cluster statistics directly from member Complaint documents.
 */
export function calculateClusterEvidence(
  complaints: IComplaint[],
  referenceDate: Date = new Date()
): TraceableClusterEvidence {
  const reportCount = complaints.length;
  if (reportCount === 0) {
    throw new Error("Cannot calculate evidence for empty complaint cluster");
  }

  // 1. Affected Localities
  const localityCounts: Record<string, number> = {};
  for (const c of complaints) {
    const loc = (c.location || "General Area").trim();
    localityCounts[loc] = (localityCounts[loc] || 0) + 1;
  }

  const localities = Object.keys(localityCounts);
  const affectedLocalities = localities.length;

  // 2. Geographic Concentration (Herfindahl-Hirschman Index - HHI)
  let hhi = 0;
  let dominantLocality = localities[0] || "Unknown";
  let maxCount = 0;

  for (const loc of localities) {
    const count = localityCounts[loc];
    const share = count / reportCount;
    hhi += share * share;
    if (count > maxCount) {
      maxCount = count;
      dominantLocality = loc;
    }
  }

  const dominantLocalityShare =
    reportCount > 0 ? Number(((maxCount / reportCount) * 100).toFixed(1)) : 0;

  // 3. Photo Evidence Submissions
  let photoEvidenceCount = 0;
  const affectedGroupsSet = new Set<string>();

  for (const c of complaints) {
    const hasPhoto = Boolean(
      (c.imageUrl && c.imageUrl.trim().length > 0) ||
      (Array.isArray(c.imageUrls) &&
        c.imageUrls.some((u) => u && u.trim().length > 0))
    );
    if (hasPhoto) {
      photoEvidenceCount++;
    }
    if (Array.isArray(c.affectedGroups)) {
      for (const g of c.affectedGroups) {
        if (g && g.trim()) affectedGroupsSet.add(g.trim());
      }
    }
  }

  // 4. Severity Distribution
  const severityBreakdown = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const c of complaints) {
    const s = c.severity || "medium";
    if (s in severityBreakdown) {
      severityBreakdown[s as keyof typeof severityBreakdown]++;
    } else {
      severityBreakdown.medium++;
    }
  }

  // 5. Temporal Trend (14-day recent vs 14-day previous)
  const windowMs = 14 * 24 * 60 * 60 * 1000;
  const refTime = referenceDate.getTime();
  const recentThreshold = refTime - windowMs;
  const previousThreshold = refTime - 2 * windowMs;

  let recentCount = 0;
  let previousCount = 0;

  for (const c of complaints) {
    const cTime = new Date(c.createdAt).getTime();
    if (cTime >= recentThreshold && cTime <= refTime) {
      recentCount++;
    } else if (cTime >= previousThreshold && cTime < recentThreshold) {
      previousCount++;
    }
  }

  let trendPercent = 0;
  if (previousCount > 0) {
    trendPercent = Math.round(((recentCount - previousCount) / previousCount) * 100);
  } else if (recentCount > 0) {
    trendPercent = 100;
  }

  return {
    reportCount,
    affectedLocalities,
    localities,
    photoEvidenceCount,
    recentCount,
    previousCount,
    trendPercent,
    severityBreakdown,
    affectedGroups: Array.from(affectedGroupsSet),
    geographicHHI: Number(hhi.toFixed(3)),
    dominantLocality,
    dominantLocalityShare,
  };
}

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
