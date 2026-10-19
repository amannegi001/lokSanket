import type { IComplaint } from "@/models/Complaint";
import type { IClusterEvidence } from "@/models/IssueCluster";
import { RawClusterGroup, groupComplaintsIntoClusters } from "./clustering";

export type PriorityLevel = "High" | "Medium" | "Low";

export interface PriorityClassificationOptions {
  safe?: boolean;
  fallback?: PriorityLevel;
}

/**
 * Global Deterministic Priority Configuration.
 * 
 * Weights:
 * - 30% Demand Volume
 * - 25% Severity
 * - 20% Recent Trend
 * - 15% Geographic Concentration
 * - 10% Evidence Strength
 * 
 * Classification Thresholds:
 * - High:   80 <= score <= 100
 * - Medium: 60 <= score < 80
 * - Low:     0 <= score < 60
 */
export const PRIORITY_CONFIG = {
  weights: {
    demandVolume: 0.30, // 30%
    severity: 0.25, // 25%
    recentTrend: 0.20, // 20%
    geographicConcentration: 0.15, // 15%
    evidenceStrength: 0.10, // 10%
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

/**
 * Validates whether an unknown value is a valid numerical priority score (0–100 number).
 */
export function isValidPriorityScore(score: unknown): score is number {
  return (
    typeof score === "number" &&
    !Number.isNaN(score) &&
    Number.isFinite(score) &&
    score >= 0 &&
    score <= 100
  );
}

/**
 * Shared Deterministic Priority Classification Function.
 * 
 * Source of truth:
 * - High:   Score >= 80 and <= 100
 * - Medium: Score >= 60 and < 80
 * - Low:    Score >= 0 and < 60
 * 
 * Invariants:
 * 1. The numerical score is the single authoritative source of truth.
 * 2. Scores are NOT rounded before classification; rounding is for display only.
 * 3. Invalid inputs (negative numbers, numbers > 100, NaN, non-numeric values like null,
 *    undefined, strings, objects) are handled safely:
 *    - By default throws TypeError or RangeError rather than silently receiving an incorrect label.
 *    - If options.safe is true, returns options.fallback (defaults to "Low").
 */
export function classifyPriority(
  score: unknown,
  options?: PriorityClassificationOptions
): PriorityLevel {
  const isValidNumber =
    typeof score === "number" && !Number.isNaN(score) && Number.isFinite(score);
  const isInBounds = isValidNumber && score >= 0 && score <= 100;

  if (!isInBounds) {
    if (options?.safe) {
      return options.fallback ?? "Low";
    }
    if (!isValidNumber) {
      throw new TypeError(
        `Invalid priority score: ${String(score)}. Priority score must be a finite number.`
      );
    }
    throw new RangeError(
      `Priority score out of bounds: ${score}. Priority score must be between 0 and 100.`
    );
  }

  if (score >= PRIORITY_CONFIG.thresholds.high) {
    return "High";
  }
  if (score >= PRIORITY_CONFIG.thresholds.medium) {
    return "Medium";
  }
  return "Low";
}

export const getPriorityLevel = classifyPriority;

export interface PriorityComponentBreakdown {
  name: string;
  rawEvidence: string;
  rawValue: number;
  normalizedScore: number;
  weightPercent: number;
  weightedContribution: number;
}

export interface PriorityScoreExplanation {
  clusterId?: string;
  title: string;
  priorityScore: number;
  priorityLevel: "High" | "Medium" | "Low";
  components: {
    demandVolume: PriorityComponentBreakdown;
    severity: PriorityComponentBreakdown;
    recentTrend: PriorityComponentBreakdown;
    geographicConcentration: PriorityComponentBreakdown;
    evidenceStrength: PriorityComponentBreakdown;
  };
}

export interface CalculatedClusterData {
  clusterKey: string;
  title: string;
  category: string;
  subcategory: string;
  wardIds: string[];
  complaintIds: string[];
  reportCount: number;
  demandVolumeScore: number;
  severityScore: number;
  trendScore: number;
  geographicScore: number;
  evidenceScore: number;
  priorityScore: number;
  priorityLevel: "High" | "Medium" | "Low";
  evidence: IClusterEvidence;
  explanation: PriorityScoreExplanation;
}

// ============================================================================
// 1. DEMAND VOLUME SCORE (0–100)
// ============================================================================
/**
 * Normalizes report count relative to the maximum observed cluster volume
 * or a predefined capacity baseline.
 * 
 * Formula:
 * demandScore = Math.min(100, Math.max(0, (reportCount / maxReportCount) * 100))
 * 
 * Reasoning:
 * - Linear scaling relative to cohort peak guarantees fair representation of civic demand.
 * - Single-report issues receive low proportional volume; peak clusters achieve maximum volume.
 */
export function calculateDemandVolumeScore(
  reportCount: number,
  maxReportCount: number
): { score: number; rawEvidence: string } {
  if (reportCount <= 0 || maxReportCount <= 0) {
    return { score: 0, rawEvidence: "0 reports" };
  }
  const rawScore = (reportCount / maxReportCount) * 100;
  const score = Number(Math.min(100, Math.max(0, rawScore)).toFixed(1));
  return {
    score,
    rawEvidence: `${reportCount} reports (cohort max: ${maxReportCount})`,
  };
}

// ============================================================================
// 2. SEVERITY SCORE (0–100)
// ============================================================================
/**
 * Calculates weighted average severity based on explicit point mappings:
 * - Low: 25 points
 * - Medium: 50 points
 * - High: 75 points
 * - Critical: 100 points
 * 
 * Formula:
 * severityScore = (low*25 + med*50 + high*75 + crit*100) / reportCount
 */
export function calculateSeverityScore(severityBreakdown: {
  low: number;
  medium: number;
  high: number;
  critical: number;
}): { score: number; rawEvidence: string } {
  const total =
    severityBreakdown.low +
    severityBreakdown.medium +
    severityBreakdown.high +
    severityBreakdown.critical;

  if (total <= 0) {
    return { score: 0, rawEvidence: "0 reports with severity" };
  }

  const weightedSum =
    severityBreakdown.low * PRIORITY_CONFIG.severityMapping.low +
    severityBreakdown.medium * PRIORITY_CONFIG.severityMapping.medium +
    severityBreakdown.high * PRIORITY_CONFIG.severityMapping.high +
    severityBreakdown.critical * PRIORITY_CONFIG.severityMapping.critical;

  const score = Number((weightedSum / total).toFixed(1));
  const rawEvidence = `${severityBreakdown.critical} critical, ${severityBreakdown.high} high, ${severityBreakdown.medium} med, ${severityBreakdown.low} low`;

  return {
    score: Math.min(100, Math.max(0, score)),
    rawEvidence,
  };
}

// ============================================================================
// 3. RECENT TREND SCORE (0–100)
// ============================================================================
/**
 * Compares recent window volume (last 14 days) against previous window volume (15–28 days ago).
 * 
 * Dynamics:
 * - Neutral baseline: 50 points (0% change).
 * - Increasing trend (+1% to +100%+): scales from 50 up to 100.
 * - Declining trend (-1% to -100%): scales from 50 down to 0.
 * - Emerging surge (previous = 0, recent > 0): scales 60 to 100 based on recent volume.
 * - Inactive / dormant (previous = 0, recent = 0): 50 points (neutral).
 */
export function calculateTrendScore(
  recentCount: number,
  previousCount: number
): { score: number; trendPercent: number; rawEvidence: string } {
  if (recentCount === 0 && previousCount === 0) {
    return {
      score: 50,
      trendPercent: 0,
      rawEvidence: "0 recent vs 0 previous (stable/no activity in 28-day window)",
    };
  }

  if (previousCount === 0 && recentCount > 0) {
    // Emerging new surge without historical baseline
    const surgeScore = Math.min(100, Math.round(60 + Math.min(40, recentCount * 2)));
    return {
      score: surgeScore,
      trendPercent: 100,
      rawEvidence: `${recentCount} recent vs 0 previous (+100% emerging surge)`,
    };
  }

  const diff = recentCount - previousCount;
  const trendPercent = Math.round((diff / previousCount) * 100);

  let score = 50;
  if (trendPercent >= 0) {
    // 0% -> 50, +100% or greater -> 100
    score = Math.min(100, 50 + (trendPercent / 100) * 50);
  } else {
    // 0% -> 50, -100% -> 0
    score = Math.max(0, 50 + (trendPercent / 100) * 50);
  }

  const roundedScore = Number(score.toFixed(1));
  const sign = trendPercent > 0 ? "+" : "";
  const rawEvidence = `${recentCount} recent vs ${previousCount} previous (${sign}${trendPercent}%)`;

  return {
    score: roundedScore,
    trendPercent,
    rawEvidence,
  };
}

// ============================================================================
// 4. GEOGRAPHIC CONCENTRATION SCORE (0–100)
// ============================================================================
/**
 * Uses Herfindahl-Hirschman Index (HHI) of locality distribution.
 * HHI = sum(share_i^2)
 * 
 * Square-root concentration normalization:
 * geographicScore = Math.min(100, Math.round(Math.sqrt(HHI) * 100))
 * 
 * Reasoning:
 * - 1 single locality gives HHI = 1.0 -> sqrt(1.0) * 100 = 100 (hyper-concentrated).
 * - 2-3 localities give 60–85.
 * - 5 equal localities give sqrt(0.20) * 100 = 45.
 * - 20+ dispersed localities give <25.
 */
export function calculateGeographicConcentrationScore(
  localities: string[],
  localityCounts: Record<string, number>,
  totalReports: number
): { score: number; hhi: number; rawEvidence: string } {
  if (totalReports <= 0 || localities.length === 0) {
    return { score: 0, hhi: 0, rawEvidence: "0 localities" };
  }

  let hhi = 0;
  let dominantLocality = localities[0];
  let maxCount = 0;

  for (const loc of localities) {
    const count = localityCounts[loc] || 0;
    const share = count / totalReports;
    hhi += share * share;
    if (count > maxCount) {
      maxCount = count;
      dominantLocality = loc;
    }
  }

  const dominantShare = Number(((maxCount / totalReports) * 100).toFixed(1));
  const score = Math.min(100, Math.max(0, Math.round(Math.sqrt(hhi) * 100)));
  const rawEvidence = `${localities.length} localities (dominant: ${dominantLocality} ${dominantShare}%)`;

  return {
    score,
    hhi: Number(hhi.toFixed(3)),
    rawEvidence,
  };
}

// ============================================================================
// 5. EVIDENCE STRENGTH SCORE (0–100)
// ============================================================================
/**
 * Multi-factor evidence credibility score:
 * 1. Photo verification ratio (up to 40 pts)
 * 2. Corroboration breadth / affected localities (up to 25 pts)
 * 3. High & critical severity ratio (up to 20 pts)
 * 4. Sample volume credibility on diminishing log scale (up to 15 pts)
 */
export function calculateEvidenceStrengthScore(params: {
  reportCount: number;
  photoEvidenceCount: number;
  affectedLocalities: number;
  highCount: number;
  criticalCount: number;
}): { score: number; rawEvidence: string } {
  const {
    reportCount,
    photoEvidenceCount,
    affectedLocalities,
    highCount,
    criticalCount,
  } = params;

  if (reportCount <= 0) {
    return { score: 0, rawEvidence: "0 reports of evidence" };
  }

  // 1. Photo verification (up to 40 pts): 15%+ photo evidence achieves max 40 points
  const photoRatio = photoEvidenceCount / reportCount;
  const photoPoints = Math.min(40, (photoRatio / 0.15) * 40);

  // 2. Corroboration breadth across distinct localities (up to 25 pts)
  const localitiesPoints = Math.min(25, affectedLocalities * 5);

  // 3. High & critical severity ratio (up to 20 pts)
  const highOrCritRatio = (highCount + criticalCount) / reportCount;
  const severityPoints = highOrCritRatio * 20;

  // 4. Sample volume credibility on diminishing log scale (up to 15 pts)
  const volumePoints = Math.min(15, Math.log2(reportCount + 1) * 2.5);

  const rawSum = photoPoints + localitiesPoints + severityPoints + volumePoints;
  const score = Number(Math.min(100, Math.max(0, rawSum)).toFixed(1));

  const photoPct = (photoRatio * 100).toFixed(1);
  const rawEvidence = `${photoEvidenceCount} photos (${photoPct}%), ${affectedLocalities} locs, ${highCount + criticalCount} high/crit alerts`;

  return {
    score,
    rawEvidence,
  };
}

// ============================================================================
// 6. OVERALL PRIORITY SCORE & EXPLANATION
// ============================================================================
/**
 * Calculates the complete deterministic priority score and explanation
 * from cluster complaints or evidence attributes.
 */
export function calculateClusterPriority(
  cluster: RawClusterGroup,
  maxReportCount: number,
  referenceDate: Date = new Date()
): CalculatedClusterData {
  const complaints = cluster.complaints;
  const reportCount = complaints.length;

  if (reportCount === 0) {
    throw new Error(`Cluster "${cluster.title}" has zero complaints`);
  }

  // A. Locality counts
  const localityCounts: Record<string, number> = {};
  for (const c of complaints) {
    const loc = (c.location || "General Area").trim();
    localityCounts[loc] = (localityCounts[loc] || 0) + 1;
  }
  const localities = Object.keys(localityCounts);

  // B. Severity counts
  const severityBreakdown = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const c of complaints) {
    const s = c.severity || "medium";
    if (s in severityBreakdown) {
      severityBreakdown[s as keyof typeof severityBreakdown]++;
    } else {
      severityBreakdown.medium++;
    }
  }

  // C. Temporal counts (14-day window)
  const windowMs = PRIORITY_CONFIG.trendWindowDays * 24 * 60 * 60 * 1000;
  const refTime = referenceDate.getTime();
  const recentThreshold = refTime - windowMs;
  const previousThreshold = refTime - 2 * windowMs;

  let recentCount = 0;
  let previousCount = 0;
  let photoEvidenceCount = 0;
  const affectedGroupsSet = new Set<string>();

  for (const c of complaints) {
    const cTime = new Date(c.createdAt).getTime();
    if (cTime >= recentThreshold && cTime <= refTime) {
      recentCount++;
    } else if (cTime >= previousThreshold && cTime < recentThreshold) {
      previousCount++;
    }

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

  // D. Compute normalized component scores (0–100)
  const demand = calculateDemandVolumeScore(reportCount, maxReportCount);
  const severity = calculateSeverityScore(severityBreakdown);
  const trend = calculateTrendScore(recentCount, previousCount);
  const geo = calculateGeographicConcentrationScore(localities, localityCounts, reportCount);
  const evidenceStr = calculateEvidenceStrengthScore({
    reportCount,
    photoEvidenceCount,
    affectedLocalities: localities.length,
    highCount: severityBreakdown.high,
    criticalCount: severityBreakdown.critical,
  });

  // E. Weighted Final Score Calculation
  const w = PRIORITY_CONFIG.weights;
  const demandContrib = demand.score * w.demandVolume;
  const severityContrib = severity.score * w.severity;
  const trendContrib = trend.score * w.recentTrend;
  const geoContrib = geo.score * w.geographicConcentration;
  const evidenceContrib = evidenceStr.score * w.evidenceStrength;

  const rawPriorityScore =
    demandContrib +
    severityContrib +
    trendContrib +
    geoContrib +
    evidenceContrib;

  const priorityScore = Number(
    Math.min(100, Math.max(0, Math.round(rawPriorityScore * 10) / 10)).toFixed(1)
  );

  // F. Classification Level
  const priorityLevel = classifyPriority(priorityScore);

  // G. Traceability Explanation Object
  const explanation: PriorityScoreExplanation = {
    title: cluster.title,
    priorityScore,
    priorityLevel,
    components: {
      demandVolume: {
        name: "Demand Volume",
        rawEvidence: demand.rawEvidence,
        rawValue: reportCount,
        normalizedScore: demand.score,
        weightPercent: Math.round(w.demandVolume * 100),
        weightedContribution: Number(demandContrib.toFixed(2)),
      },
      severity: {
        name: "Severity",
        rawEvidence: severity.rawEvidence,
        rawValue: Number((severity.score).toFixed(1)),
        normalizedScore: severity.score,
        weightPercent: Math.round(w.severity * 100),
        weightedContribution: Number(severityContrib.toFixed(2)),
      },
      recentTrend: {
        name: "Recent Trend",
        rawEvidence: trend.rawEvidence,
        rawValue: trend.trendPercent,
        normalizedScore: trend.score,
        weightPercent: Math.round(w.recentTrend * 100),
        weightedContribution: Number(trendContrib.toFixed(2)),
      },
      geographicConcentration: {
        name: "Geographic Concentration",
        rawEvidence: geo.rawEvidence,
        rawValue: geo.hhi,
        normalizedScore: geo.score,
        weightPercent: Math.round(w.geographicConcentration * 100),
        weightedContribution: Number(geoContrib.toFixed(2)),
      },
      evidenceStrength: {
        name: "Evidence Strength",
        rawEvidence: evidenceStr.rawEvidence,
        rawValue: photoEvidenceCount,
        normalizedScore: evidenceStr.score,
        weightPercent: Math.round(w.evidenceStrength * 100),
        weightedContribution: Number(evidenceContrib.toFixed(2)),
      },
    },
  };

  // H. Evidence Document
  const evidenceDoc: IClusterEvidence = {
    reportCount,
    affectedLocalities: localities.length,
    localities,
    photoEvidenceCount,
    trendPercent: trend.trendPercent,
    recentCount,
    previousCount,
    severityBreakdown,
    affectedGroups: Array.from(affectedGroupsSet),
    demandVolumeScore: demand.score,
    severityScore: severity.score,
    trendScore: trend.score,
    geographicScore: geo.score,
    evidenceScore: evidenceStr.score,
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
    demandVolumeScore: demand.score,
    severityScore: severity.score,
    trendScore: trend.score,
    geographicScore: geo.score,
    evidenceScore: evidenceStr.score,
    priorityScore,
    priorityLevel,
    evidence: evidenceDoc,
    explanation,
  };
}

/**
 * Pipeline processing: groups complaints and computes priority scores
 * for all clusters sorted descending by priorityScore.
 */
export function processComplaintsPipeline(
  complaints: IComplaint[],
  referenceDate: Date = new Date()
): CalculatedClusterData[] {
  const rawClusters = groupComplaintsIntoClusters(complaints);
  if (rawClusters.length === 0) return [];

  const maxReportCount = Math.max(...rawClusters.map((rc) => rc.complaints.length));

  const calculatedClusters = rawClusters.map((cluster) =>
    calculateClusterPriority(cluster, maxReportCount, referenceDate)
  );

  // Deterministic sort: highest priorityScore first, reportCount as tie-breaker
  calculatedClusters.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    return b.reportCount - a.reportCount;
  });

  return calculatedClusters;
}


