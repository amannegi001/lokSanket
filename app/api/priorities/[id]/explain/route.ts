import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { IssueCluster } from "@/models/IssueCluster";
import { Complaint } from "@/models/Complaint";
import { explainClusterWithGemini } from "@/lib/gemini";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;

    const cluster = await IssueCluster.findById(id);
    if (!cluster) {
      return NextResponse.json(
        { success: false, error: "Issue cluster not found." },
        { status: 404 }
      );
    }

    // Load sample raw complaint quotes to give linguistic grounding
    const sampleDocs = await Complaint.find({
      _id: { $in: cluster.complaintIds.slice(0, 5) },
    })
      .select("rawText")
      .lean();

    const sampleQuotes = sampleDocs.map((d) => d.rawText).filter(Boolean);

    // Call Gemini with verified statistics only
    const explanation = await explainClusterWithGemini({
      title: cluster.title,
      category: cluster.category,
      subcategory: cluster.subcategory,
      wardIds: cluster.wardIds,
      priorityScore: cluster.priorityScore,
      priorityLevel: cluster.priorityLevel,
      evidence: {
        reportCount: cluster.evidence.reportCount,
        affectedLocalities: cluster.evidence.affectedLocalities,
        localities: cluster.evidence.localities,
        photoEvidenceCount: cluster.evidence.photoEvidenceCount,
        trendPercent: cluster.evidence.trendPercent,
        recentCount: cluster.evidence.recentCount,
        previousCount: cluster.evidence.previousCount,
        severityBreakdown: cluster.evidence.severityBreakdown,
        affectedGroups: cluster.evidence.affectedGroups,
        demandVolumeScore: cluster.evidence.demandVolumeScore,
        severityScore: cluster.evidence.severityScore,
        trendScore: cluster.evidence.trendScore,
        geographicScore: cluster.evidence.geographicScore,
        evidenceScore: cluster.evidence.evidenceScore,
        priorityScore: cluster.evidence.priorityScore,
      },
      sampleComplaints: sampleQuotes,
    });

    // Save generated explanation to database
    cluster.aiExplanation = explanation;
    cluster.updatedAt = new Date();
    await cluster.save();

    return NextResponse.json({
      success: true,
      explanation,
      clusterId: cluster._id,
    });
  } catch (error: unknown) {
    console.error("[POST /api/priorities/:id/explain] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate AI decision-support explanation.",
      },
      { status: 500 }
    );
  }
}
