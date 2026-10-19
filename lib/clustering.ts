import type { IComplaint } from "@/models/Complaint";

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
 * Safely sanitizes citizen location input into a non-sensitive ward or neighborhood identifier.
 * Prevents exposing full street addresses, house numbers, or private details.
 */
export function sanitizeLocality(location?: string, rawText?: string): string {
  const combined = `${location || ""} ${rawText || ""}`;

  // 1. Check for explicit Ward or Sector pattern
  const wardMatch = combined.match(/\b(?:Ward|वार्ड)[-\s]*(\d+)\b/i);
  if (wardMatch && wardMatch[1]) {
    return `Ward ${wardMatch[1]}`;
  }

  const sectorMatch = combined.match(/\b(?:Sector|सेक्टर)[-\s]*(\d+)\b/i);
  if (sectorMatch && sectorMatch[1]) {
    return `Sector ${sectorMatch[1]}`;
  }

  if (!location || !location.trim()) {
    return "Constituency Area";
  }

  // 2. If it's a multi-part address, pick the neighborhood / locality segment,
  // discarding house/flat numbers, building names, and city
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (/^(?:[A-Za-z]?\s*\d+|h(?:ouse)?\.?\s*no|flat|plot|door)\b/i.test(part)) continue;
    if (/sadan|niwas|apartment|heights|villa|enclave/i.test(part) && parts.length > 2) continue;
    if (part.length >= 3 && !/^\d{5,6}$/.test(part)) {
      return part
        .toLowerCase()
        .replace(/\b[a-z]/g, (c) => c.toUpperCase());
    }
  }

  return "Constituency Area";
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


