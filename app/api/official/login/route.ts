import { NextResponse } from "next/server";
import {
  getOfficialDemoCode,
  getOfficialSessionToken,
  OFFICIAL_COOKIE_NAME,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: "Access code is required." },
        { status: 400 }
      );
    }

    const trimmedCode = code.trim();
    const expectedCode = getOfficialDemoCode();

    if (trimmedCode !== expectedCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid access code. Please check the demo code and try again.",
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        message: "Official demo access granted.",
        redirect: "/official",
      },
      { status: 200 }
    );

    // Set HTTP-only, secure (in production), SameSite cookie
    response.cookies.set(OFFICIAL_COOKIE_NAME, getOfficialSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: unknown) {
    console.error("[POST /api/official/login] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process official login." },
      { status: 500 }
    );
  }
}
