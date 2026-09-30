import { NextResponse } from "next/server";
import { OFFICIAL_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json(
    {
      success: true,
      message: "Exited official review mode.",
      redirect: "/",
    },
    { status: 200 }
  );

  response.cookies.set(OFFICIAL_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function GET() {
  return POST();
}
