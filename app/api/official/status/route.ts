import { NextResponse } from "next/server";
import { isOfficialAuthenticatedRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const authenticated = isOfficialAuthenticatedRequest(request);
  return NextResponse.json({
    authenticated,
  });
}
