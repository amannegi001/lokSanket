import { IComplaint } from "@/models/Complaint";

export interface RawClusterGroup {
  clusterKey: string;
  title: string;
  category: string;
  subcategory: string;
  wardIds: string[];
  complaints: IComplaint[];
}

/**
 * Extracts a normalized ward identifier from location or complaint text.
 * E.g., "Ward 17 - Gandhi Nagar" -> "Ward 17"
 *       "वार्ड 14" -> "Ward 14"
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
    const clean = location.split(",")[0].trim();
    if (clean.length > 0) return clean;
  }

  return "Constituency General";
}

/**
 * Normalizes category and subcategory string keys for stable clustering.
 */
function normalizeString(str?: string): string {
  return (str || "General").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Deterministic clustering algorithm.
 * Groups complaints by Category + Subcategory + Primary Geographic Zone (Ward).
 * 
 * Design is modular: in future phases, a semantic similarity or embedding-based
 * threshold can be plugged into this interface without changing the downstream
 * priority calculation or database models.
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

    const clusterKey = `${normCat}:::${normSub}:::${normWard}`;

    let cluster = clustersMap.get(clusterKey);
    if (!cluster) {
      cluster = {
        clusterKey,
        title: `${category} - ${subcategory} (${ward})`,
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
