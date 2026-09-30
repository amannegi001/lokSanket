import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { IssueCluster } from "@/models/IssueCluster";
import { Review } from "@/models/Review";
import { isOfficialAuthenticatedRequest } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid issue cluster identifier." },
        { status: 400 }
      );
    }

    const clusterId = new mongoose.Types.ObjectId(id);
    const latestReview = await Review.findOne({ clusterId })
      .sort({ reviewedAt: -1, createdAt: -1 })
      .lean();

    if (!latestReview || !latestReview.decision) {
      // Check if cluster has an embedded review with a valid decision
      const cluster = await IssueCluster.findById(clusterId).select("review").lean();
      if (cluster?.review && cluster.review.decision) {
        return NextResponse.json({
          success: true,
          review: cluster.review,
        });
      }

      return NextResponse.json({
        success: true,
        review: null,
      });
    }

    return NextResponse.json({
      success: true,
      review: latestReview,
    });
  } catch (error: unknown) {
    console.error("[GET /api/priorities/:id/review] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch review." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    if (!isOfficialAuthenticatedRequest(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Official demo access required to record human review decisions.",
        },
        { status: 401 }
      );
    }

    await connectDB();
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid issue cluster identifier." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const { decision, note, adjustedPriorityLevel } = body;

    // Validate decision: accept | adjust | reject
    if (!decision || typeof decision !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Review decision is required ('accept', 'adjust', or 'reject').",
        },
        { status: 400 }
      );
    }

    const rawDecision = decision.trim().toLowerCase();
    if (!["accept", "adjust", "reject"].includes(rawDecision)) {
      return NextResponse.json(
        {
          success: false,
          error: "Decision must be one of: 'accept', 'adjust', or 'reject'.",
        },
        { status: 400 }
      );
    }
    const normalizedDecision = rawDecision as "accept" | "adjust" | "reject";

    // Validate adjustedPriorityLevel when adjusting
    let normalizedAdjustedLevel: "high" | "medium" | "low" | undefined = undefined;
    if (normalizedDecision === "adjust") {
      if (!adjustedPriorityLevel || typeof adjustedPriorityLevel !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: "Adjusted priority level is required when choosing 'adjust' ('High', 'Medium', or 'Low').",
          },
          { status: 400 }
        );
      }

      const rawLevel = adjustedPriorityLevel.trim().toLowerCase();
      if (!["high", "medium", "low"].includes(rawLevel)) {
        return NextResponse.json(
          {
            success: false,
            error: "Adjusted priority level must be 'High', 'Medium', or 'Low'.",
          },
          { status: 400 }
        );
      }
      normalizedAdjustedLevel = rawLevel as "high" | "medium" | "low";
    }

    // Validate note
    const sanitizedNote = typeof note === "string" ? note.trim().slice(0, 2000) : "";

    const clusterId = new mongoose.Types.ObjectId(id);
    const existingCluster = await IssueCluster.findById(clusterId);
    if (!existingCluster) {
      return NextResponse.json(
        { success: false, error: "Issue cluster not found." },
        { status: 404 }
      );
    }

    const reviewedAt = new Date();

    // 1. Create a Review record in the Review collection
    const reviewRecord = new Review({
      clusterId,
      decision: normalizedDecision,
      note: sanitizedNote,
      adjustedPriorityLevel: normalizedAdjustedLevel,
      reviewedAt,
    });
    await reviewRecord.save();

    // 2. Map legacy officialDecision for backwards compatibility
    const legacyOfficialDecision =
      normalizedDecision === "accept"
        ? "approved_for_action"
        : normalizedDecision === "adjust"
        ? "approved_for_action"
        : "deferred";

    // 3. Update the IssueCluster document review state
    // CRITICAL RULE: Do NOT modify existing priorityScore or existing priorityLevel.
    existingCluster.review = {
      decision: normalizedDecision,
      note: sanitizedNote,
      adjustedPriorityLevel: normalizedAdjustedLevel,
      reviewedAt,
    };
    existingCluster.officialDecision = legacyOfficialDecision;
    existingCluster.updatedAt = reviewedAt;

    await existingCluster.save();

    return NextResponse.json(
      {
        success: true,
        review: {
          _id: reviewRecord._id.toString(),
          clusterId: id,
          decision: reviewRecord.decision,
          note: reviewRecord.note,
          adjustedPriorityLevel: reviewRecord.adjustedPriorityLevel,
          reviewedAt: reviewRecord.reviewedAt,
        },
        cluster: existingCluster.toObject(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[POST /api/priorities/:id/review] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record human review decision." },
      { status: 500 }
    );
  }
}
