import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { IssueCluster } from "@/models/IssueCluster";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level");
    const category = searchParams.get("category");
    const ward = searchParams.get("ward");
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));

    const filter: Record<string, unknown> = {};
    if (level) {
      filter.priorityLevel = level;
    }
    if (category) {
      filter.category = new RegExp(category, "i");
    }
    if (ward) {
      filter.wardIds = ward;
    }

    // Deterministic ranking: highest priorityScore first
    const clusters = await IssueCluster.find(filter)
      .sort({ priorityScore: -1, reportCount: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      count: clusters.length,
      clusters,
    });
  } catch (error: unknown) {
    console.error("[GET /api/priorities] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch ranked priority clusters.",
      },
      { status: 500 }
    );
  }
}
