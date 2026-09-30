import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { extractComplaintWithGemini } from "@/lib/gemini";
import { validatePhotoFile, storePhotoInGridFS } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let rawText = "";
    let location = "";
    let requestedLanguage = "";
    let imageUrl: string | undefined = undefined;
    let uploadedFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      rawText = (
        (formData.get("rawText") as string) ||
        (formData.get("text") as string) ||
        ""
      ).trim();
      location = (
        (formData.get("location") as string) ||
        (formData.get("locality") as string) ||
        ""
      ).trim();
      requestedLanguage = (
        (formData.get("language") as string) ||
        ""
      ).trim();
      imageUrl = (
        (formData.get("imageUrl") as string) ||
        ""
      ).trim() || undefined;

      const fileEntry =
        formData.get("photo") ||
        formData.get("file") ||
        formData.get("image");

      if (
        fileEntry &&
        typeof fileEntry === "object" &&
        "size" in fileEntry &&
        (fileEntry as File).size > 0
      ) {
        uploadedFile = fileEntry as File;
      }
    } else {
      const body = await request.json().catch(() => null);

      if (!body || typeof body !== "object") {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid request payload. Expected JSON object or FormData.",
          },
          { status: 400 }
        );
      }

      rawText = (body.rawText || body.text || "").trim();
      location = (body.location || body.locality || "").trim();
      requestedLanguage = (body.language || "").trim();
      imageUrl = (body.imageUrl || "").trim() || undefined;
    }

    // Process photo file if uploaded
    if (uploadedFile) {
      const validation = validatePhotoFile(uploadedFile);
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: validation.error || "Invalid photo file.",
          },
          { status: 400 }
        );
      }

      try {
        const stored = await storePhotoInGridFS(uploadedFile);
        imageUrl = stored.url;
      } catch (storageError: unknown) {
        console.error(
          "[POST /api/complaints] Failed to store photo in GridFS:",
          storageError
        );
        return NextResponse.json(
          {
            success: false,
            error: "Failed to store uploaded photo evidence. Please try again.",
          },
          { status: 500 }
        );
      }
    }

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
