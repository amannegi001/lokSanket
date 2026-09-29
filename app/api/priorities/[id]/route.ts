import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { IssueCluster } from "@/models/IssueCluster";
import { Complaint } from "@/models/Complaint";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;

    const cluster = await IssueCluster.findById(id).lean();
    if (!cluster) {
      return NextResponse.json(
        { success: false, error: "Issue cluster not found." },
        { status: 404 }
      );
    }

    // Fetch sample underlying complaints for ground-truth inspection
    const sampleComplaints = await Complaint.find({
      _id: { $in: cluster.complaintIds },
    })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    return NextResponse.json({
      success: true,
      cluster,
      sampleComplaints,
    });
  } catch (error: unknown) {
    console.error("[GET /api/priorities/:id] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve priority cluster." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const { officialDecision } = body;
    const allowedDecisions = [
      "pending_review",
      "approved_for_action",
      "in_progress",
      "deferred",
      "resolved",
    ];

    if (officialDecision && !allowedDecisions.includes(officialDecision)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid decision. Allowed values: ${allowedDecisions.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const updated = await IssueCluster.findByIdAndUpdate(
      id,
      {
        $set: {
          officialDecision: officialDecision || "pending_review",
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Issue cluster not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      cluster: updated,
    });
  } catch (error: unknown) {
    console.error("[PATCH /api/priorities/:id] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update review decision." },
      { status: 500 }
    );
  }
}
