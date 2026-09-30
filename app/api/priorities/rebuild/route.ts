import { NextResponse } from "next/server";
import { recalculateAndPersistPriorities } from "@/lib/priority";
import { isOfficialAuthenticatedRequest } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    if (!isOfficialAuthenticatedRequest(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Official demo access required to recalculate priorities.",
        },
        { status: 401 }
      );
    }

    const result = await recalculateAndPersistPriorities();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "No complaints found to cluster. Please submit complaints or run the seed script first.",
        },
        { status: 400 }
      );
    }

    const highCount = result.rankedClusters.filter((c) => c.priorityLevel === "High").length;
    const medCount = result.rankedClusters.filter((c) => c.priorityLevel === "Medium").length;
    const lowCount = result.rankedClusters.filter((c) => c.priorityLevel === "Low").length;

    return NextResponse.json({
      success: true,
      message: "Issue clusters and priority scores successfully recalculated.",
      totalClustersGenerated: result.totalClustersUpdated,
      breakdown: {
        high: highCount,
        medium: medCount,
        low: lowCount,
      },
      topClusters: result.rankedClusters.slice(0, 5),
    });
  } catch (error: unknown) {
    console.error("[POST /api/priorities/rebuild] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to recalculate priority clusters.",
      },
      { status: 500 }
    );
  }
}
