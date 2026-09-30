import { cookies } from "next/headers";

export const OFFICIAL_COOKIE_NAME = "loksanket_official_session";

/**
 * Returns the expected official demo code configured in environment variables.
 * Default fallback is "loksanket2026" for seamless hackathon evaluation.
 */
export function getOfficialDemoCode(): string {
  return process.env.OFFICIAL_DEMO_CODE || "loksanket2026";
}

/**
 * Returns the secret server-side session token representing an active official demo session.
 */
export function getOfficialSessionToken(): string {
  return process.env.OFFICIAL_SESSION_TOKEN || "ls_official_session_demo_secret_token_2026";
}

/**
 * Validates whether an incoming HTTP request contains a valid official demo session.
 * Checks both the HTTP-only cookie and the optional Authorization Bearer header.
 */
export function isOfficialAuthenticatedRequest(request: Request): boolean {
  const expectedToken = getOfficialSessionToken();

  // 1. Check Cookie header
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookieList = cookieHeader.split(";").map((c) => c.trim());
    const match = cookieList.find((c) => c.startsWith(`${OFFICIAL_COOKIE_NAME}=`));
    if (match) {
      const value = match.slice(`${OFFICIAL_COOKIE_NAME}=`.length);
      if (value === expectedToken) {
        return true;
      }
    }
  }

  // 2. Check Authorization Bearer (useful for curl/automated test scripts)
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token === expectedToken) {
      return true;
    }
  }

  return false;
}

/**
 * Async helper for Next.js Server Components and Route Handlers using next/headers cookies()
 */
export async function isOfficialAuthenticatedServer(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(OFFICIAL_COOKIE_NAME);
    return sessionCookie?.value === getOfficialSessionToken();
  } catch {
    return false;
  }
}
