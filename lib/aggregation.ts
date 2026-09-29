import { Complaint } from "@/models/Complaint";

export interface CategorySummary {
  category: string;
  count: number;
  percentage: number;
}

export interface WardSummary {
  ward: string;
  count: number;
  distinctLocalities: number;
}

export interface SeverityDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface LocalityEvidence {
  locality: string;
  count: number;
  share: number;
}

export interface CategoryWardEvidence {
  category: string;
  ward: string;
  totalReports: number;
  affectedLocalities: LocalityEvidence[];
  affectedLocalitiesCount: number;
  photoEvidenceCount: number;
  photoEvidencePercentage: number;
  severityDistribution: SeverityDistribution;
  highOrCriticalCount: number;
  recentCount: number;
  previousCount: number;
  olderCount: number;
  trendPercent: number;
  isIncreasingTrend: boolean;
  geographicConcentration: {
    hhi: number;
    dominantLocality: string;
    dominantShare: number;
  };
  sampleComplaints: Array<{
    _id: string;
    rawText: string;
    language: string;
    location?: string;
    severity: string;
    hasPhoto: boolean;
    createdAt: Date;
  }>;
}

export interface ConstituencySummary {
  datasetLabel: "Realistic Demonstration Data";
  totalReports: number;
  categories: CategorySummary[];
  wards: WardSummary[];
  severityDistribution: SeverityDistribution;
  recentReportVolume: number; // Last 14 days
  previousPeriodVolume: number; // 15-28 days ago
  trendPercent: number;
  photoEvidenceCount: number;
  photoEvidencePercentage: number;
  languageDistribution: {
    hindi: number;
    hinglish: number;
    english: number;
    other: number;
  };
}

/**
 * Deterministic aggregation of the overall constituency demonstration dataset.
 * Computes KPIs, category distributions, ward distributions, severity breakdowns,
 * recent vs. previous temporal trends, and photo counts directly from stored Complaint documents.
 */
export async function aggregateConstituencySummary(
  referenceDate: Date = new Date()
): Promise<ConstituencySummary> {
  const refTime = referenceDate.getTime();
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const recentThreshold = new Date(refTime - fourteenDaysMs);
  const previousThreshold = new Date(refTime - 2 * fourteenDaysMs);

  const [
    totalReports,
    categoryAgg,
    wardAgg,
    severityAgg,
    recentCount,
    previousCount,
    photoCount,
    languageAgg,
  ] = await Promise.all([
    // 1. Total reports
    Complaint.countDocuments(),

    // 2. Category distribution
    Complaint.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // 3. Ward distribution with distinct localities count
    Complaint.aggregate([
      {
        $project: {
          location: 1,
          ward: {
            $arrayElemAt: [{ $split: ["$location", " - "] }, 0],
          },
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$ward", "Unknown Ward"] },
          count: { $sum: 1 },
          localities: { $addToSet: "$location" },
        },
      },
      { $sort: { count: -1 } },
    ]),

    // 4. Severity distribution
    Complaint.aggregate([
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ]),

    // 5. Recent report volume (last 14 days)
    Complaint.countDocuments({
      createdAt: { $gte: recentThreshold, $lte: referenceDate },
    }),

    // 6. Previous-period report volume (15-28 days ago)
    Complaint.countDocuments({
      createdAt: { $gte: previousThreshold, $lt: recentThreshold },
    }),

    // 7. Photo evidence count
    Complaint.countDocuments({
      imageUrl: { $exists: true, $nin: [null, ""] },
    }),

    // 8. Language distribution
    Complaint.aggregate([
      { $group: { _id: "$language", count: { $sum: 1 } } },
    ]),
  ]);

  // Format category summary
  const categories: CategorySummary[] = categoryAgg.map((item) => ({
    category: item._id || "Uncategorized",
    count: item.count,
    percentage: totalReports > 0 ? Number(((item.count / totalReports) * 100).toFixed(1)) : 0,
  }));

  // Format ward summary
  const wards: WardSummary[] = wardAgg.map((item) => ({
    ward: item._id,
    count: item.count,
    distinctLocalities: item.localities ? item.localities.length : 0,
  }));

  // Format severity distribution
  const severityDistribution: SeverityDistribution = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const s of severityAgg) {
    if (s._id in severityDistribution) {
      severityDistribution[s._id as keyof SeverityDistribution] = s.count;
    }
  }

  // Calculate trend percentage
  let trendPercent = 0;
  if (previousCount > 0) {
    trendPercent = Math.round(((recentCount - previousCount) / previousCount) * 100);
  } else if (recentCount > 0) {
    trendPercent = 100;
  }

  // Format language distribution
  const languageDistribution = {
    hindi: 0,
    hinglish: 0,
    english: 0,
    other: 0,
  };
  for (const l of languageAgg) {
    const lang = (l._id || "").toLowerCase();
    if (lang === "hindi") languageDistribution.hindi += l.count;
    else if (lang === "hinglish") languageDistribution.hinglish += l.count;
    else if (lang === "english") languageDistribution.english += l.count;
    else languageDistribution.other += l.count;
  }

  return {
    datasetLabel: "Realistic Demonstration Data",
    totalReports,
    categories,
    wards,
    severityDistribution,
    recentReportVolume: recentCount,
    previousPeriodVolume: previousCount,
    trendPercent,
    photoEvidenceCount: photoCount,
    photoEvidencePercentage:
      totalReports > 0 ? Number(((photoCount / totalReports) * 100).toFixed(1)) : 0,
    languageDistribution,
  };
}

/**
 * Deterministic aggregation for a specific category and ward slice
 * (e.g., category: "Road Infrastructure", ward: "Ward 17").
 * Directly derives:
 * - total report count
 * - affected localities & count
 * - photo evidence count
 * - severity distribution (including high/critical count)
 * - temporal volumes (recent, previous, older) & trend percentage
 * - geographic concentration (HHI)
 */
export async function aggregateCategoryWardEvidence(options: {
  category: string;
  ward: string;
  referenceDate?: Date;
}): Promise<CategoryWardEvidence> {
  const { category, ward, referenceDate = new Date() } = options;

  const refTime = referenceDate.getTime();
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const recentThreshold = new Date(refTime - fourteenDaysMs);
  const previousThreshold = new Date(refTime - 2 * fourteenDaysMs);

  // Match condition for this category & ward slice
  const matchFilter = {
    category,
    location: { $regex: new RegExp(`^${ward}\\b`, "i") },
  };

  const [
    complaints,
    totalReports,
    localityAgg,
    severityAgg,
    recentCount,
    previousCount,
    photoCount,
  ] = await Promise.all([
    Complaint.find(matchFilter)
      .sort({ createdAt: -1 })
      .select("rawText language location severity imageUrl createdAt")
      .lean(),

    Complaint.countDocuments(matchFilter),

    Complaint.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$location", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    Complaint.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ]),

    Complaint.countDocuments({
      ...matchFilter,
      createdAt: { $gte: recentThreshold, $lte: referenceDate },
    }),

    Complaint.countDocuments({
      ...matchFilter,
      createdAt: { $gte: previousThreshold, $lt: recentThreshold },
    }),

    Complaint.countDocuments({
      ...matchFilter,
      imageUrl: { $exists: true, $nin: [null, ""] },
    }),
  ]);

  // Format localities & calculate Herfindahl-Hirschman Index (HHI)
  let hhi = 0;
  const affectedLocalities: LocalityEvidence[] = localityAgg.map((item) => {
    const loc = item._id || "Unknown Locality";
    const count = item.count;
    const share = totalReports > 0 ? count / totalReports : 0;
    hhi += share * share;
    return {
      locality: loc,
      count,
      share: Number((share * 100).toFixed(1)),
    };
  });

  const dominantLocality =
    affectedLocalities.length > 0 ? affectedLocalities[0].locality : "None";
  const dominantShare =
    affectedLocalities.length > 0 ? affectedLocalities[0].share : 0;

  // Severity distribution
  const severityDistribution: SeverityDistribution = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const s of severityAgg) {
    if (s._id in severityDistribution) {
      severityDistribution[s._id as keyof SeverityDistribution] = s.count;
    }
  }

  const highOrCriticalCount =
    severityDistribution.high + severityDistribution.critical;

  const olderCount = Math.max(0, totalReports - (recentCount + previousCount));

  // Trend percentage calculation
  let trendPercent = 0;
  if (previousCount > 0) {
    trendPercent = Math.round(((recentCount - previousCount) / previousCount) * 100);
  } else if (recentCount > 0) {
    trendPercent = 100;
  }

  // Sample complaints for verification / UI evidence cards
  const sampleComplaints = complaints.slice(0, 5).map((c) => ({
    _id: String(c._id),
    rawText: c.rawText,
    language: c.language,
    location: c.location,
    severity: c.severity,
    hasPhoto: Boolean(c.imageUrl && c.imageUrl.trim().length > 0),
    createdAt: c.createdAt,
  }));

  return {
    category,
    ward,
    totalReports,
    affectedLocalities,
    affectedLocalitiesCount: affectedLocalities.length,
    photoEvidenceCount: photoCount,
    photoEvidencePercentage:
      totalReports > 0 ? Number(((photoCount / totalReports) * 100).toFixed(1)) : 0,
    severityDistribution,
    highOrCriticalCount,
    recentCount,
    previousCount,
    olderCount,
    trendPercent,
    isIncreasingTrend: recentCount > previousCount,
    geographicConcentration: {
      hhi: Number(hhi.toFixed(3)),
      dominantLocality,
      dominantShare,
    },
    sampleComplaints,
  };
}
