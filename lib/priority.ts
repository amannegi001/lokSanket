import { IComplaint } from "@/models/Complaint";
import { RawClusterGroup, groupComplaintsIntoClusters } from "./clustering";
import { IClusterEvidence } from "@/models/IssueCluster";

export const PRIORITY_CONFIG = {
  weights: {
    demandVolume: 0.3, // 30%
    severity: 0.25, // 25%
    recentTrend: 0.2, // 20%
    geographicConcentration: 0.15, // 15%
    evidenceStrength: 0.1, // 10%
  },
  thresholds: {
    high: 80,
    medium: 60,
  },
  severityMapping: {
    low: 25,
    medium: 50,
    high: 75,
    critical: 100,
  },
  trendWindowDays: 14,
} as const;

export interface CalculatedClusterData {
  clusterKey: string;
  title: string;
  category: string;
  subcategory: string;
  wardIds: string[];
  complaintIds: string[];
  reportCount: number;
  severityScore: number;
  trendScore: number;
  geographicScore: number;
  evidenceScore: number;
  priorityScore: number;
  priorityLevel: "High" | "Medium" | "Low";
  evidence: IClusterEvidence;
}

/**
 * Calculates deterministic priority score and evidence breakdown for a cluster.
 *
 * Formula:
 * Priority Score = 30% Demand Volume + 25% Severity + 20% Recent Trend + 15% Geographic Concentration + 10% Evidence Strength
 */
export function calculateClusterPriority(
  cluster: RawClusterGroup,
  maxReportCount: number,
  referenceDate: Date = new Date()
): CalculatedClusterData {
  const complaints = cluster.complaints;
  const reportCount = complaints.length;

  if (reportCount === 0) {
    throw new Error(`Cluster ${cluster.title} has zero complaints`);
  }

  // 1. Demand Volume Score (0-100)
  // Normalized relative to the maximum complaint count across all clusters
  const demandVolumeScore =
    maxReportCount > 0
      ? Math.min(100, Math.round((reportCount / maxReportCount) * 100))
      : 100;

  // 2. Severity Score (0-100)
  // Weighted average using explicit mapping: low=25, medium=50, high=75, critical=100
  const severityBreakdown = { low: 0, medium: 0, high: 0, critical: 0 };
  let severitySum = 0;

  for (const c of complaints) {
    const s = c.severity || "medium";
    if (s in severityBreakdown) {
      severityBreakdown[s as keyof typeof severityBreakdown]++;
    } else {
      severityBreakdown.medium++;
    }
    const scoreVal =
      PRIORITY_CONFIG.severityMapping[s as keyof typeof PRIORITY_CONFIG.severityMapping] ||
      PRIORITY_CONFIG.severityMapping.medium;
    severitySum += scoreVal;
  }

  const severityScore = Math.min(
    100,
    Math.max(0, Math.round(severitySum / reportCount))
  );

  // 3. Recent Trend Score (0-100)
  // Compares complaints in the recent window (last 14 days) against the previous window (15-28 days ago)
  const windowMs = PRIORITY_CONFIG.trendWindowDays * 24 * 60 * 60 * 1000;
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
  let trendScore = 50; // Default neutral baseline

  if (previousCount === 0 && recentCount === 0) {
    trendPercent = 0;
    trendScore = 50;
  } else if (previousCount === 0 && recentCount > 0) {
    trendPercent = 100;
    // New surge with substantial recent reports
    trendScore = Math.min(100, Math.round(60 + Math.min(40, recentCount * 2)));
  } else if (previousCount > 0) {
    trendPercent = Math.round(
      ((recentCount - previousCount) / previousCount) * 100
    );
    if (trendPercent >= 0) {
      // Positive growth: 0% -> 50, +100% -> 100
      trendScore = Math.min(100, Math.round(50 + (trendPercent / 100) * 50));
    } else {
      // Decline: 0% -> 50, -100% -> 0
      trendScore = Math.max(0, Math.round(50 + (trendPercent / 100) * 50));
    }
  }

  // 4. Geographic Concentration Score (0-100)
  // Uses Herfindahl-Hirschman Index (HHI) of locality distribution.
  // When an issue is focused in specific localities rather than thinly dispersed,
  // concentration is high.
  const localityCounts: Record<string, number> = {};
  for (const c of complaints) {
    const loc = (c.location || "General Area").trim();
    localityCounts[loc] = (localityCounts[loc] || 0) + 1;
  }

  const distinctLocalities = Object.keys(localityCounts);
  let hhi = 0;
  for (const loc of distinctLocalities) {
    const share = localityCounts[loc] / reportCount;
    hhi += share * share;
  }

  // Normalize: single locality gives HHI = 1.0 (100).
  // 3-5 localities with dominant clusters give 60-85.
  // 20+ evenly spread localities give <20.
  const geographicScore = Math.min(100, Math.max(10, Math.round(hhi * 100)));

  // 5. Evidence Strength Score (0-100)
  // Combines photo submissions ratio + corroborating complaint volume + location specificity
  let photoEvidenceCount = 0;
  let specificLocationCount = 0;
  const affectedGroupsSet = new Set<string>();

  for (const c of complaints) {
    if (c.imageUrl && c.imageUrl.trim().length > 0) {
      photoEvidenceCount++;
    }
    if (c.location && c.location.trim().length > 3) {
      specificLocationCount++;
    }
    if (Array.isArray(c.affectedGroups)) {
      for (const g of c.affectedGroups) {
        if (g) affectedGroupsSet.add(g);
      }
    }
  }

  const photoRatio = photoEvidenceCount / reportCount;
  const locationRatio = specificLocationCount / reportCount;

  // Photo ratio contributes up to 55 points (e.g. 15%+ photo evidence provides strong ground proof)
  const photoPoints = Math.min(55, Math.round((photoRatio / 0.2) * 55));
  // Sample volume credibility: log scale up to 30 points (e.g. >=50 reports provides 30 pts)
  const volumePoints = Math.min(
    30,
    Math.round((Math.log10(reportCount + 1) / Math.log10(100)) * 30)
  );
  // Location specificity contributes up to 15 points
  const locationPoints = Math.round(locationRatio * 15);

  const evidenceScore = Math.min(
    100,
    Math.max(10, photoPoints + volumePoints + locationPoints)
  );

  // 6. Weighted Priority Score (0-100)
  const w = PRIORITY_CONFIG.weights;
  const rawPriorityScore =
    w.demandVolume * demandVolumeScore +
    w.severity * severityScore +
    w.recentTrend * trendScore +
    w.geographicConcentration * geographicScore +
    w.evidenceStrength * evidenceScore;

  const priorityScore = Math.round(rawPriorityScore * 10) / 10;

  // 7. Priority Level
  let priorityLevel: "High" | "Medium" | "Low";
  if (priorityScore >= PRIORITY_CONFIG.thresholds.high) {
    priorityLevel = "High";
  } else if (priorityScore >= PRIORITY_CONFIG.thresholds.medium) {
    priorityLevel = "Medium";
  } else {
    priorityLevel = "Low";
  }

  // 8. Assembled Evidence Object
  const evidence: IClusterEvidence = {
    reportCount,
    affectedLocalities: distinctLocalities.length,
    localities: distinctLocalities,
    photoEvidenceCount,
    trendPercent,
    recentCount,
    previousCount,
    severityBreakdown,
    affectedGroups: Array.from(affectedGroupsSet),
    demandVolumeScore,
    severityScore,
    trendScore,
    geographicScore,
    evidenceScore,
    priorityScore,
  };

  return {
    clusterKey: cluster.clusterKey,
    title: cluster.title,
    category: cluster.category,
    subcategory: cluster.subcategory,
    wardIds: cluster.wardIds,
    complaintIds: complaints.map((c) => String(c._id)),
    reportCount,
    severityScore,
    trendScore,
    geographicScore,
    evidenceScore,
    priorityScore,
    priorityLevel,
    evidence,
  };
}

/**
 * Executes the complete clustering and priority calculation pipeline on a collection of complaints.
 */
export function processComplaintsPipeline(
  complaints: IComplaint[],
  referenceDate: Date = new Date()
): CalculatedClusterData[] {
  // 1. Group complaints into raw clusters
  const rawClusters: RawClusterGroup[] = groupComplaintsIntoClusters(complaints);

  if (rawClusters.length === 0) {
    return [];
  }

  // Find max report count for normalization
  const maxReportCount = Math.max(...rawClusters.map((rc) => rc.complaints.length));

  // 2. Calculate priority scores for all clusters
  const calculatedClusters = rawClusters.map((cluster) =>
    calculateClusterPriority(cluster, maxReportCount, referenceDate)
  );

  // 3. Sort deterministically by priorityScore descending
  calculatedClusters.sort((a, b) => b.priorityScore - a.priorityScore);

  return calculatedClusters;
}
