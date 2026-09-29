import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { extractComplaintWithGemini } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload. Expected JSON object.",
        },
        { status: 400 }
      );
    }

    const rawText = (body.rawText || body.text || "").trim();
    const location = (body.location || body.locality || "").trim();
    const requestedLanguage = (body.language || "").trim();
    const imageUrl = (body.imageUrl || "").trim() || undefined;

    if (!rawText) {
      return NextResponse.json(
        {
          success: false,
          error: "Complaint text is required.",
        },
        { status: 400 }
      );
    }

    if (rawText.length < 5) {
      return NextResponse.json(
        {
          success: false,
          error: "Complaint text is too short. Please provide more detail.",
        },
        { status: 400 }
      );
    }

    // 1. Send complaint to Gemini for structured extraction
    let extracted;
    try {
      extracted = await extractComplaintWithGemini(
        rawText,
        requestedLanguage
      );
    } catch (geminiError: unknown) {
      console.error("[POST /api/complaints] Gemini extraction failure:", geminiError);
      return NextResponse.json(
        {
          success: false,
          error: "AI analysis service is temporarily unavailable. Please try again.",
        },
        { status: 502 }
      );
    }

    // 2. Connect to database
    try {
      await connectDB();
    } catch (dbError: unknown) {
      console.error("[POST /api/complaints] Database connection failure:", dbError);
      return NextResponse.json(
        {
          success: false,
          error: "Database service unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    // 3. Store normalized structured complaint in MongoDB
    try {
      const newComplaint = await Complaint.create({
        rawText,
        language: extracted.language || "unknown",
        normalizedText: extracted.normalizedText,
        category: extracted.category,
        subcategory: extracted.subcategory,
        summary: extracted.summary,
        severity: extracted.severity,
        affectedGroups: extracted.affectedGroups,
        keywords: extracted.keywords,
        location: location || undefined,
        imageUrl: imageUrl,
        status: "new",
        createdAt: new Date(),
      });

      return NextResponse.json(
        {
          success: true,
          complaint: newComplaint,
        },
        { status: 201 }
      );
    } catch (saveError: unknown) {
      console.error("[POST /api/complaints] Failed to save complaint:", saveError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to persist complaint. Please try again.",
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("[POST /api/complaints] Unexpected server error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while processing the complaint.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();
    const complaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error: unknown) {
    console.error("[GET /api/complaints] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch complaints.",
      },
      { status: 500 }
    );
  }
}
