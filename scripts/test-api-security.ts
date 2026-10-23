import * as path from "path";

// Load environment variables from .env.local
try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
} catch {
  // Environment variables might already be loaded
}

import { connectDB } from "../lib/db";
import { IssueCluster } from "../models/IssueCluster";
import { getOfficialSessionToken, OFFICIAL_COOKIE_NAME } from "../lib/auth";
import { GET as getPriority, PATCH as patchPriority } from "../app/api/priorities/[id]/route";
import { POST as explainPriority } from "../app/api/priorities/[id]/explain/route";
import { GET as getReview, POST as postReview } from "../app/api/priorities/[id]/review/route";
import { POST as rebuildPriorities } from "../app/api/priorities/rebuild/route";
import { POST as generateBrief } from "../app/api/brief/route";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? `: ${detail}` : ""}`);
    testsFailed++;
  }
}

async function runSecurityTests() {
  console.log("=================================================");
  console.log("🔒 Priority & Mutation API Security & Validation Tests");
  console.log("=================================================\n");

  await connectDB();

  // Find a valid cluster from the database for positive tests
  const existingCluster = await IssueCluster.findOne().lean();
  const validClusterId = existingCluster ? existingCluster._id.toString() : "6abce1d7f55ac509d17a2485";
  const nonExistentClusterId = "000000000000000000000000";
  const invalidObjectId = "not-a-valid-hex-id-1234";

  const validToken = getOfficialSessionToken();
  const validCookieHeader = `${OFFICIAL_COOKIE_NAME}=${validToken}`;
  const validBearerHeader = `Bearer ${validToken}`;

  // ---------------------------------------------------------------------------
  // 1. PATCH /api/priorities/[id] Security & Validation
  // ---------------------------------------------------------------------------
  console.log("1. PATCH /api/priorities/[id] Authentication & Validation:");

  // 1.1 Unauthenticated request returns 401
  {
    const req = new Request(`http://localhost:3000/api/priorities/${validClusterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officialDecision: "approved_for_action" }),
    });
    const res = await patchPriority(req, { params: Promise.resolve({ id: validClusterId }) });
    assert(res.status === 401, "Unauthenticated PATCH returns 401 Unauthorized");
  }

  // 1.2 Invalid Bearer token returns 401
  {
    const req = new Request(`http://localhost:3000/api/priorities/${validClusterId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid_secret_token",
      },
      body: JSON.stringify({ officialDecision: "approved_for_action" }),
    });
    const res = await patchPriority(req, { params: Promise.resolve({ id: validClusterId }) });
    assert(res.status === 401, "Invalid Bearer token returns 401 Unauthorized");
  }

  // 1.3 Invalid ObjectId returns 400
  {
    const req = new Request(`http://localhost:3000/api/priorities/${invalidObjectId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: validCookieHeader,
      },
      body: JSON.stringify({ officialDecision: "approved_for_action" }),
    });
    const res = await patchPriority(req, { params: Promise.resolve({ id: invalidObjectId }) });
    assert(res.status === 400, "Malformed ObjectId on PATCH returns 400 Bad Request");
  }

  // 1.4 Invalid or missing JSON body returns 400
  {
    const req = new Request(`http://localhost:3000/api/priorities/${validClusterId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: validCookieHeader,
      },
      body: "invalid-json-string",
    });
    const res = await patchPriority(req, { params: Promise.resolve({ id: validClusterId }) });
    assert(res.status === 400, "Malformed JSON body on PATCH returns 400 Bad Request");
  }

  // 1.5 Missing officialDecision returns 400
  {
    const req = new Request(`http://localhost:3000/api/priorities/${validClusterId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: validCookieHeader,
      },
      body: JSON.stringify({}),
    });
    const res = await patchPriority(req, { params: Promise.resolve({ id: validClusterId }) });
    assert(res.status === 400, "Missing officialDecision on PATCH returns 400 Bad Request");
  }

  // 1.6 Invalid officialDecision value returns 400
  {
    const req = new Request(`http://localhost:3000/api/priorities/${validClusterId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: validCookieHeader,
      },
      body: JSON.stringify({ officialDecision: "unauthorized_arbitrary_status" }),
    });
    const res = await patchPriority(req, { params: Promise.resolve({ id: validClusterId }) });
    assert(res.status === 400, "Invalid officialDecision value returns 400 Bad Request");
  }

  // 1.7 Non-existent cluster returns 404
  {
    const req = new Request(`http://localhost:3000/api/priorities/${nonExistentClusterId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: validCookieHeader,
      },
      body: JSON.stringify({ officialDecision: "approved_for_action" }),
    });
    const res = await patchPriority(req, { params: Promise.resolve({ id: nonExistentClusterId }) });
    assert(res.status === 404, "Non-existent cluster ID on PATCH returns 404 Not Found");
  }

  // 1.8 Authenticated PATCH with valid decision returns 200
  {
    const req = new Request(`http://localhost:3000/api/priorities/${validClusterId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: validBearerHeader,
      },
      body: JSON.stringify({ officialDecision: "in_progress" }),
    });
    const res = await patchPriority(req, { params: Promise.resolve({ id: validClusterId }) });
    assert(res.status === 200, "Authenticated PATCH with valid Bearer token returns 200 OK");
  }

  // ---------------------------------------------------------------------------
  // 2. POST /api/priorities/[id]/explain Security & Validation
  // ---------------------------------------------------------------------------
  console.log("\n2. POST /api/priorities/[id]/explain Authentication & Validation:");

  // 2.1 Unauthenticated request returns 401
  {
    const req = new Request(`http://localhost:3000/api/priorities/${validClusterId}/explain`, {
      method: "POST",
    });
    const res = await explainPriority(req, { params: Promise.resolve({ id: validClusterId }) });
    assert(res.status === 401, "Unauthenticated POST explain returns 401 Unauthorized");
  }

  // 2.2 Invalid ObjectId returns 400
  {
    const req = new Request(`http://localhost:3000/api/priorities/${invalidObjectId}/explain`, {
      method: "POST",
      headers: { Cookie: validCookieHeader },
    });
    const res = await explainPriority(req, { params: Promise.resolve({ id: invalidObjectId }) });
    assert(res.status === 400, "Malformed ObjectId on explain returns 400 Bad Request");
  }

  // 2.3 Non-existent cluster returns 404
  {
    const req = new Request(`http://localhost:3000/api/priorities/${nonExistentClusterId}/explain`, {
      method: "POST",
      headers: { Cookie: validCookieHeader },
    });
    const res = await explainPriority(req, { params: Promise.resolve({ id: nonExistentClusterId }) });
    assert(res.status === 404, "Non-existent cluster on explain returns 404 Not Found");
  }

  // ---------------------------------------------------------------------------
  // 3. POST /api/priorities/[id]/review Security & Validation
  // ---------------------------------------------------------------------------
  console.log("\n3. POST /api/priorities/[id]/review Authentication & Validation:");

  // 3.1 Unauthenticated request returns 401
  {
    const req = new Request(`http://localhost:3000/api/priorities/${validClusterId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "accept", note: "Approved" }),
    });
    const res = await postReview(req, { params: Promise.resolve({ id: validClusterId }) });
    assert(res.status === 401, "Unauthenticated review submission returns 401 Unauthorized");
  }

  // 3.2 Invalid decision returns 400
  {
    const req = new Request(`http://localhost:3000/api/priorities/${validClusterId}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: validCookieHeader,
      },
      body: JSON.stringify({ decision: "invalid_action" }),
    });
    const res = await postReview(req, { params: Promise.resolve({ id: validClusterId }) });
    assert(res.status === 400, "Invalid review decision value returns 400 Bad Request");
  }

  // 3.3 Note exceeding 2000 characters returns 400
  {
    const longNote = "A".repeat(2001);
    const req = new Request(`http://localhost:3000/api/priorities/${validClusterId}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: validCookieHeader,
      },
      body: JSON.stringify({ decision: "accept", note: longNote }),
    });
    const res = await postReview(req, { params: Promise.resolve({ id: validClusterId }) });
    assert(res.status === 400, "Review note > 2000 chars returns 400 Bad Request");
  }

  // 3.4 Non-string note returns 400
  {
    const req = new Request(`http://localhost:3000/api/priorities/${validClusterId}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: validCookieHeader,
      },
      body: JSON.stringify({ decision: "accept", note: 12345 }),
    });
    const res = await postReview(req, { params: Promise.resolve({ id: validClusterId }) });
    assert(res.status === 400, "Non-string note returns 400 Bad Request");
  }

  // 3.5 Decision 'adjust' without adjustedPriorityLevel returns 400
  {
    const req = new Request(`http://localhost:3000/api/priorities/${validClusterId}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: validCookieHeader,
      },
      body: JSON.stringify({ decision: "adjust", note: "Need change" }),
    });
    const res = await postReview(req, { params: Promise.resolve({ id: validClusterId }) });
    assert(res.status === 400, "Decision 'adjust' missing adjustedPriorityLevel returns 400 Bad Request");
  }

  // 3.6 Non-existent cluster returns 404
  {
    const req = new Request(`http://localhost:3000/api/priorities/${nonExistentClusterId}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: validCookieHeader,
      },
      body: JSON.stringify({ decision: "accept", note: "Approved" }),
    });
    const res = await postReview(req, { params: Promise.resolve({ id: nonExistentClusterId }) });
    assert(res.status === 404, "Non-existent cluster on review returns 404 Not Found");
  }

  // ---------------------------------------------------------------------------
  // 4. Other Protected Mutations: Rebuild & Brief
  // ---------------------------------------------------------------------------
  console.log("\n4. Other Protected Mutation Endpoints:");

  // 4.1 POST /api/priorities/rebuild unauthenticated returns 401
  {
    const req = new Request("http://localhost:3000/api/priorities/rebuild", { method: "POST" });
    const res = await rebuildPriorities(req);
    assert(res.status === 401, "Unauthenticated POST /api/priorities/rebuild returns 401 Unauthorized");
  }

  // 4.2 POST /api/brief unauthenticated returns 401
  {
    const req = new Request("http://localhost:3000/api/brief", { method: "POST" });
    const res = await generateBrief(req);
    assert(res.status === 401, "Unauthenticated POST /api/brief returns 401 Unauthorized");
  }

  // ---------------------------------------------------------------------------
  // 5. Public Read-Only Access
  // ---------------------------------------------------------------------------
  console.log("\n5. Public Read-Only Endpoints (Must remain accessible without auth):");

  // 5.1 GET /api/priorities/[id] accessible without auth
  {
    const req = new Request(`http://localhost:3000/api/priorities/${validClusterId}`, { method: "GET" });
    const res = await getPriority(req, { params: Promise.resolve({ id: validClusterId }) });
    assert(res.status === 200, "Public GET /api/priorities/[id] returns 200 OK without auth");
  }

  // 5.2 GET /api/priorities/[id]/review accessible without auth
  {
    const req = new Request(`http://localhost:3000/api/priorities/${validClusterId}/review`, { method: "GET" });
    const res = await getReview(req, { params: Promise.resolve({ id: validClusterId }) });
    assert(res.status === 200, "Public GET /api/priorities/[id]/review returns 200 OK without auth");
  }

  // 5.3 Malformed ObjectId on public GET returns 400 (not 500)
  {
    const req = new Request(`http://localhost:3000/api/priorities/${invalidObjectId}`, { method: "GET" });
    const res = await getPriority(req, { params: Promise.resolve({ id: invalidObjectId }) });
    assert(res.status === 400, "Public GET with malformed ObjectId returns 400 Bad Request");
  }

  console.log("\n=================================================");
  console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log("=================================================");

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSecurityTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
