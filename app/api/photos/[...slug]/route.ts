import { NextResponse } from "next/server";
import { Readable } from "stream";
import { getPhotoFromGridFS } from "@/lib/storage";

interface RouteContext {
  params: Promise<{ slug: string[] }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!slug || slug.length === 0) {
      return NextResponse.json(
        { success: false, error: "File identifier is required." },
        { status: 400 }
      );
    }

    const fileId = slug[0];
    const photo = await getPhotoFromGridFS(fileId);

    if (!photo) {
      return NextResponse.json(
        { success: false, error: "Photo evidence not found." },
        { status: 404 }
      );
    }

    // Convert Node.js readable stream to Web standard ReadableStream
    const webStream = Readable.toWeb(photo.stream as Readable);

    return new Response(webStream as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": photo.contentType,
        "Content-Length": String(photo.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${encodeURIComponent(photo.filename)}"`,
      },
    });
  } catch (error: unknown) {
    console.error("[GET /api/photos] Failed to serve photo evidence:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve photo evidence." },
      { status: 500 }
    );
  }
}
