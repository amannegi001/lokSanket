import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { IssueCluster } from "@/models/IssueCluster";
import { Complaint } from "@/models/Complaint";
import { Review } from "@/models/Review";
import {
  generateDevelopmentBriefWithGemini,
  BriefEvidencePayload,
  PriorityEvidenceItem,
} from "@/lib/gemini";
import { isOfficialAuthenticatedRequest } from "@/lib/auth";

export async function GET() {
  try {
    await connectDB();

    const [totalReports, clusters] = await Promise.all([
      Complaint.countDocuments(),
      IssueCluster.find().sort({ priorityScore: -1, reportCount: -1 }).limit(10).lean(),
    ]);

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const reportsLast14Days = await Complaint.countDocuments({
      createdAt: { $gte: fourteenDaysAgo },
    });

    const clusterIds = clusters.map((c) => c._id);
    const reviews = await Review.find({ clusterId: { $in: clusterIds } })
      .sort({ reviewedAt: -1, createdAt: -1 })
      .lean();

    const reviewByClusterId = new Map<string, typeof reviews[0]>();
    for (const r of reviews) {
      const cId = r.clusterId?.toString();
      if (cId && !reviewByClusterId.has(cId)) {
        reviewByClusterId.set(cId, r);
      }
    }

    const priorities: PriorityEvidenceItem[] = clusters.map((c) => {
      const cId = c._id.toString();
      const canonicalReview = reviewByClusterId.get(cId);

      let hr: {
        decision: "accept" | "adjust" | "reject";
        adjustedPriorityLevel?: "high" | "medium" | "low";
        note?: string;
        reviewedAt?: string;
      } | null = null;

      if (canonicalReview && canonicalReview.decision) {
        hr = {
          decision: canonicalReview.decision,
          adjustedPriorityLevel: canonicalReview.adjustedPriorityLevel,
          note: canonicalReview.note || "",
          reviewedAt: canonicalReview.reviewedAt ? new Date(canonicalReview.reviewedAt).toISOString() : undefined,
        };
      } else if (c.review && c.review.decision) {
        hr = {
          decision: c.review.decision,
          adjustedPriorityLevel: c.review.adjustedPriorityLevel,
          note: c.review.note || "",
          reviewedAt: c.review.reviewedAt ? new Date(c.review.reviewedAt).toISOString() : undefined,
        };
      }

      return {
        id: c._id.toString(),
        title: c.title,
        category: c.category,
        subcategory: c.subcategory,
        wardIds: c.wardIds || [],
        priorityScore: c.priorityScore,
        priorityLevel: c.priorityLevel,
        reportCount: c.reportCount,
        localityCount: c.evidence?.affectedLocalities || c.evidence?.localities?.length || 1,
        localities: c.evidence?.localities || [],
        recentTrendPercent: c.evidence?.trendPercent ?? 0,
        recentCount: c.evidence?.recentCount ?? 0,
        previousCount: c.evidence?.previousCount ?? 0,
        severityScore: c.evidence?.severityScore ?? c.severityScore,
        geographicScore: c.evidence?.geographicScore ?? c.geographicScore,
        evidenceScore: c.evidence?.evidenceScore ?? c.evidenceScore,
        photoCount: c.evidence?.photoEvidenceCount ?? 0,
        affectedGroups: c.evidence?.affectedGroups || [],
        humanReview: hr,
      };
    });

    return NextResponse.json({
      success: true,
      readyToGenerate: clusters.length > 0,
      evidencePreview: {
        constituency: "Central Demonstration Constituency (Ward 1–25)",
        totalReports,
        totalClusters: clusters.length,
        reportsLast14Days,
        topPrioritiesCount: priorities.length,
      },
    });
  } catch (error: unknown) {
    console.error("[GET /api/brief] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to inspect development brief evidence." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isOfficialAuthenticatedRequest(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Official demo access required to generate development briefs.",
        },
        { status: 401 }
      );
    }

    await connectDB();

    // 1. Fetch current deterministic priority cluster data directly from MongoDB
    const [totalReports, clusters] = await Promise.all([
      Complaint.countDocuments(),
      IssueCluster.find().sort({ priorityScore: -1, reportCount: -1 }).limit(10).lean(),
    ]);

    if (!clusters || clusters.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No issue clusters found in database. Please run clustering or seed data first.",
        },
        { status: 400 }
      );
    }

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const reportsLast14Days = await Complaint.countDocuments({
      createdAt: { $gte: fourteenDaysAgo },
    });

    // 2. Build structured deterministic evidence payload
    // Gemini receives ONLY this factual data and cannot invent statistics.
    const clusterIds = clusters.map((c) => c._id);
    const reviews = await Review.find({ clusterId: { $in: clusterIds } })
      .sort({ reviewedAt: -1, createdAt: -1 })
      .lean();

    const reviewByClusterId = new Map<string, typeof reviews[0]>();
    for (const r of reviews) {
      const cId = r.clusterId?.toString();
      if (cId && !reviewByClusterId.has(cId)) {
        reviewByClusterId.set(cId, r);
      }
    }

    const priorityEvidenceList: PriorityEvidenceItem[] = clusters.map((c) => {
      const cId = c._id.toString();
      const canonicalReview = reviewByClusterId.get(cId);

      let hr: {
        decision: "accept" | "adjust" | "reject";
        adjustedPriorityLevel?: "high" | "medium" | "low";
        note?: string;
        reviewedAt?: string;
      } | null = null;

      if (canonicalReview && canonicalReview.decision) {
        hr = {
          decision: canonicalReview.decision,
          adjustedPriorityLevel: canonicalReview.adjustedPriorityLevel,
          note: canonicalReview.note || "",
          reviewedAt: canonicalReview.reviewedAt ? new Date(canonicalReview.reviewedAt).toISOString() : undefined,
        };
      } else if (c.review && c.review.decision) {
        hr = {
          decision: c.review.decision,
          adjustedPriorityLevel: c.review.adjustedPriorityLevel,
          note: c.review.note || "",
          reviewedAt: c.review.reviewedAt ? new Date(c.review.reviewedAt).toISOString() : undefined,
        };
      }

      return {
        id: c._id.toString(),
        title: c.title,
        category: c.category,
        subcategory: c.subcategory,
        wardIds: c.wardIds || [],
        priorityScore: c.priorityScore,
        priorityLevel: c.priorityLevel,
        reportCount: c.reportCount,
        localityCount: c.evidence?.affectedLocalities || c.evidence?.localities?.length || 1,
        localities: c.evidence?.localities || [],
        recentTrendPercent: c.evidence?.trendPercent ?? 0,
        recentCount: c.evidence?.recentCount ?? 0,
        previousCount: c.evidence?.previousCount ?? 0,
        severityScore: c.evidence?.severityScore ?? c.severityScore,
        geographicScore: c.evidence?.geographicScore ?? c.geographicScore,
        evidenceScore: c.evidence?.evidenceScore ?? c.evidenceScore,
        photoCount: c.evidence?.photoEvidenceCount ?? 0,
        affectedGroups: c.evidence?.affectedGroups || [],
        humanReview: hr,
      };
    });

    const evidencePayload: BriefEvidencePayload = {
      constituency: "Central Demonstration Constituency (Ward 1–25)",
      generatedAt: new Date().toISOString(),
      totalReports,
      totalClusters: clusters.length,
      reportsLast14Days,
      priorities: priorityEvidenceList,
    };

    // 3. Send deterministic evidence payload to Gemini for narrative synthesis
    const geminiOutput = await generateDevelopmentBriefWithGemini(evidencePayload);

    // 4. Validate Gemini response
    if (
      !geminiOutput ||
      typeof geminiOutput.executiveSummary !== "string" ||
      geminiOutput.executiveSummary.trim().length < 15 ||
      !Array.isArray(geminiOutput.priorities) ||
      !Array.isArray(geminiOutput.dataLimitations)
    ) {
      console.error("[POST /api/brief] Gemini returned malformed brief structure:", geminiOutput);
      return NextResponse.json(
        {
          success: false,
          error: "Gemini returned an invalid development brief structure. Please retry.",
        },
        { status: 502 }
      );
    }

    // 5. Combine deterministic ground truth with Gemini narrative brief
    const synthesizedPriorities = priorityEvidenceList.map((det, index) => {
      // Find matching Gemini priority by title or fallback to index
      const gItem =
        geminiOutput.priorities.find(
          (p) => p.title && p.title.toLowerCase().includes(det.title.toLowerCase().slice(0, 15))
        ) || geminiOutput.priorities[index];

      return {
        id: det.id,
        title: det.title,
        category: det.category,
        subcategory: det.subcategory,
        wardIds: det.wardIds,
        priorityScore: det.priorityScore,
        priorityLevel: det.priorityLevel,
        reportCount: det.reportCount,
        localityCount: det.localityCount,
        localities: det.localities,
        recentTrendPercent: det.recentTrendPercent,
        photoCount: det.photoCount,
        humanReview: det.humanReview,
        summary:
          gItem?.summary ||
          `LokSanket identifies this as a ${det.priorityLevel.toLowerCase()}-priority issue based on ${det.reportCount} citizen reports and ${det.photoCount} verified photos.`,
        evidenceNarrative:
          gItem?.evidence && gItem.evidence.length > 0
            ? gItem.evidence
            : [
                `${det.reportCount} total citizen reports lodged across ${det.localityCount} localities.`,
                `Recent 14-day trend: ${det.recentTrendPercent >= 0 ? "+" : ""}${det.recentTrendPercent}%.`,
                `${det.photoCount} citizen photo submissions verified in evidence audit.`,
              ],
        affectedAreas: gItem?.affectedAreas && gItem.affectedAreas.length > 0 ? gItem.affectedAreas : det.localities,
        fieldVerification:
          gItem?.fieldVerification ||
          "Conduct physical ground audit with ward junior engineers to inspect reported civic infrastructure damage.",
      };
    });

    const fieldVerificationSummary = synthesizedPriorities.map((p) => ({
      priorityTitle: p.title,
      recommendation: p.fieldVerification,
    }));

    // Explicit data limitations as required by PRD
    const dataLimitations =
      geminiOutput.dataLimitations.length > 0
        ? geminiOutput.dataLimitations
        : [
            "Demonstration dataset is synthetic and reflects simulated municipal grievance distributions.",
            "Citizen intake volume represents proactive reporter activity and may not capture unvoiced issues across all demographics.",
            "Location tags reflect citizen-reported landmarks and addresses; physical verification is required.",
            "LokSanket is a decision-support advisory system, not an autonomous government decision-maker. Official human verification is required before budget or civil works authorization.",
          ];

    return NextResponse.json({
      success: true,
      generatedAt: evidencePayload.generatedAt,
      evidence: evidencePayload,
      brief: {
        executiveSummary: geminiOutput.executiveSummary,
        priorities: synthesizedPriorities,
        fieldVerificationSummary,
        dataLimitations,
      },
      provenance: {
        dataSource: "Stored MongoDB Complaints, Clusters, and Official Reviews",
        isSynthetic: true,
        datasetLabel: "Realistic Demonstration Data",
        decisionSupportNotice:
          "LokSanket is decision support, not an autonomous government decision-maker. All priorities subject to official review.",
      },
    });
  } catch (error: unknown) {
    console.error("[POST /api/brief] Error generating brief:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate development brief. Please ensure the Gemini service is accessible and retry.",
      },
      { status: 500 }
    );
  }
}
