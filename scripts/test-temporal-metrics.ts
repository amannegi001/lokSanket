import {
  TEMPORAL_CONFIG,
  getTemporalWindows,
  resolveReferenceDateSync,
  getEffectiveReferenceDate,
} from "../lib/temporal";
import {
  calculateTrendScore,
  calculateClusterPriority,
  processComplaintsPipeline,
} from "../lib/priority";
import { RawClusterGroup } from "../lib/clustering";
import { IComplaint } from "../models/Complaint";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? `: ${detail}` : ""}`);
    failed++;
  }
}

function makeComplaint(createdAt: Date, overrides: Partial<IComplaint> = {}): IComplaint {
  return {
    rawText: "Sample temporal complaint",
    language: "english",
    category: "Road Infrastructure",
    subcategory: "Potholes",
    summary: "Road damage detected",
    severity: "medium",
    affectedGroups: ["commuters"],
    keywords: ["road"],
    location: "Ward 1 - Main Street",
    status: "new",
    createdAt,
    ...overrides,
  } as IComplaint;
}

async function runTemporalTests() {
  console.log("=================================================");
  console.log("⏱️ LokSanket Temporal & Time-Dependent Metrics Tests");
  console.log("=================================================\n");

  const FIXED_REF_DATE = new Date("2026-09-30T12:00:00.000Z");
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const ONE_HOUR_MS = 60 * 60 * 1000;

  // -------------------------------------------------------------------------
  // 1. Reference Date & Window Configuration
  // -------------------------------------------------------------------------
  console.log("1. Reference Date & Window Boundary Definitions:");
  const windows = getTemporalWindows(FIXED_REF_DATE);

  assert(
    windows.refDate.getTime() === FIXED_REF_DATE.getTime(),
    "Reference date matches fixed injected timestamp"
  );
  assert(
    windows.recentThreshold.getTime() ===
      FIXED_REF_DATE.getTime() - 14 * ONE_DAY_MS,
    "Recent threshold is exactly 14 days prior to reference date"
  );
  assert(
    windows.previousThreshold.getTime() ===
      FIXED_REF_DATE.getTime() - 28 * ONE_DAY_MS,
    "Previous threshold is exactly 28 days prior to reference date"
  );
  assert(
    windows.timelineThreshold.getTime() ===
      FIXED_REF_DATE.getTime() - 28 * ONE_DAY_MS,
    "Timeline chart threshold aligns with 28-day window"
  );
  assert(
    windows.monthlyThreshold.getTime() ===
      FIXED_REF_DATE.getTime() - 30 * ONE_DAY_MS,
    "Monthly cycle threshold is exactly 30 days prior"
  );

  // -------------------------------------------------------------------------
  // 2. Boundary Timestamps: Inside, Boundary, and Outside
  // -------------------------------------------------------------------------
  console.log("\n2. Boundary Timestamp Handling:");

  // A. Inside recent window (7 days ago)
  const cRecent = makeComplaint(new Date(FIXED_REF_DATE.getTime() - 7 * ONE_DAY_MS));
  // B. Exactly on recent upper bound (at refDate)
  const cAtRef = makeComplaint(new Date(FIXED_REF_DATE.getTime()));
  // C. Exactly on recent lower bound (at refDate - 14 days)
  const cAt14dBound = makeComplaint(new Date(FIXED_REF_DATE.getTime() - 14 * ONE_DAY_MS));
  // D. Just inside previous window (at refDate - 14 days - 1 hour)
  const cPrev = makeComplaint(new Date(FIXED_REF_DATE.getTime() - 14 * ONE_DAY_MS - ONE_HOUR_MS));
  // E. Exactly on previous lower bound (at refDate - 28 days)
  const cAt28dBound = makeComplaint(new Date(FIXED_REF_DATE.getTime() - 28 * ONE_DAY_MS));
  // F. Outside 28-day window (at refDate - 29 days)
  const cOlder = makeComplaint(new Date(FIXED_REF_DATE.getTime() - 29 * ONE_DAY_MS));
  // G. Future-dated complaint (at refDate + 1 day)
  const cFuture = makeComplaint(new Date(FIXED_REF_DATE.getTime() + ONE_DAY_MS));

  const testGroup: RawClusterGroup = {
    clusterKey: "road_infrastructure:::potholes:::ward 1",
    title: "Road Damage",
    category: "Road Infrastructure",
    subcategory: "Potholes",
    wardIds: ["Ward 1"],
    complaints: [cRecent, cAtRef, cAt14dBound, cPrev, cAt28dBound, cOlder, cFuture],
  };

  const calculated = calculateClusterPriority(testGroup, 100, FIXED_REF_DATE);

  // Recent: cRecent, cAtRef, cAt14dBound (3 complaints)
  // Previous: cPrev, cAt28dBound (2 complaints)
  // Older & Future excluded from trend counts
  assert(
    calculated.evidence.recentCount === 3,
    `Recent count correctly includes reports within [ref-14d, ref] (got ${calculated.evidence.recentCount}, expected 3)`
  );
  assert(
    calculated.evidence.previousCount === 2,
    `Previous count correctly includes reports within [ref-28d, ref-14d) (got ${calculated.evidence.previousCount}, expected 2)`
  );
  assert(
    calculated.reportCount === 7,
    `Total report count counts all complaints in cluster regardless of window (got ${calculated.reportCount}, expected 7)`
  );

  // -------------------------------------------------------------------------
  // 3. Trend Score Comparisons: Surges, Declines, Zero Previous, Zero Recent
  // -------------------------------------------------------------------------
  console.log("\n3. Trend Score Comparisons & Edge Cases:");

  // 3A. Equal activity in both periods
  const trendEqual = calculateTrendScore(10, 10);
  assert(trendEqual.trendPercent === 0, "10 recent vs 10 previous produces 0% trend");
  assert(trendEqual.score === 50, "0% trend produces neutral 50.0 score");

  // 3B. 100% surge (20 recent vs 10 previous)
  const trendSurge = calculateTrendScore(20, 10);
  assert(trendSurge.trendPercent === 100, "20 recent vs 10 previous produces +100% trend");
  assert(trendSurge.score === 100, "+100% trend reaches max 100.0 score");

  // 3C. -50% decline (5 recent vs 10 previous)
  const trendDecline = calculateTrendScore(5, 10);
  assert(trendDecline.trendPercent === -50, "5 recent vs 10 previous produces -50% trend");
  assert(trendDecline.score === 25, "-50% trend produces 25.0 score");

  // 3D. Emerging surge without baseline (10 recent vs 0 previous)
  const trendEmerging = calculateTrendScore(10, 0);
  assert(trendEmerging.trendPercent === 100, "Emerging surge has trendPercent = 100%");
  assert(
    trendEmerging.score >= 80,
    `Emerging surge score is high priority (score = ${trendEmerging.score})`
  );
  assert(
    !Number.isNaN(trendEmerging.score),
    "Emerging surge avoids division by zero (not NaN)"
  );

  // 3E. Complete drop-off (0 recent vs 10 previous)
  const trendDropoff = calculateTrendScore(0, 10);
  assert(trendDropoff.trendPercent === -100, "0 recent vs 10 previous produces -100% trend");
  assert(trendDropoff.score === 0, "Complete drop-off produces 0.0 trend score");

  // 3F. Empty dataset (0 recent vs 0 previous)
  const trendZero = calculateTrendScore(0, 0);
  assert(trendZero.trendPercent === 0, "0 recent vs 0 previous produces 0% trend");
  assert(trendZero.score === 50, "Empty period produces 50.0 baseline score");

  // -------------------------------------------------------------------------
  // 4. Empty Cluster Pipeline Safety
  // -------------------------------------------------------------------------
  console.log("\n4. Empty Cluster Pipeline Safety:");
  const emptyPipelineResult = processComplaintsPipeline([], FIXED_REF_DATE);
  assert(
    Array.isArray(emptyPipelineResult) && emptyPipelineResult.length === 0,
    "processComplaintsPipeline returns empty array safely for 0 complaints"
  );

  let emptyClusterThrew = false;
  try {
    calculateClusterPriority(
      {
        clusterKey: "empty:::empty:::empty",
        title: "Empty Cluster",
        category: "Other",
        subcategory: "Other",
        wardIds: [],
        complaints: [],
      },
      100,
      FIXED_REF_DATE
    );
  } catch {
    emptyClusterThrew = true;
  }
  assert(
    emptyClusterThrew,
    "calculateClusterPriority safely throws on empty complaints array to prevent empty cluster creation"
  );

  // -------------------------------------------------------------------------
  // 5. Reference Date Resolution Order & Production Safety
  // -------------------------------------------------------------------------
  console.log("\n5. Reference Date Resolution Order & Production Safety:");

  // Save current env
  const origEnvRef = process.env.PRIORITY_REFERENCE_DATE;

  try {
    // 5A. No override and no env var -> defaults to current system clock
    delete process.env.PRIORITY_REFERENCE_DATE;
    const beforeCall = Date.now();
    const systemResolved = await getEffectiveReferenceDate();
    const afterCall = Date.now();
    assert(
      systemResolved.getTime() >= beforeCall && systemResolved.getTime() <= afterCall,
      "No override or env var uses actual current system clock (new Date())"
    );

    // 5B. Explicit override Date instance is strictly respected
    const customDate = new Date("2026-04-12T08:30:00.000Z");
    const explicitResolved = await getEffectiveReferenceDate(customDate);
    assert(
      explicitResolved.getTime() === customDate.getTime(),
      "Explicit override Date instance is strictly respected"
    );

    // 5C. Explicit override date string is strictly respected
    const explicitStringResolved = await getEffectiveReferenceDate("2026-07-20T15:00:00.000Z");
    assert(
      explicitStringResolved.toISOString() === "2026-07-20T15:00:00.000Z",
      "Explicit override date string is strictly respected"
    );

    // 5D. Valid configured PRIORITY_REFERENCE_DATE env var is respected
    process.env.PRIORITY_REFERENCE_DATE = "2026-09-30T10:00:00.000Z";
    const envResolved = await getEffectiveReferenceDate();
    assert(
      envResolved.toISOString() === "2026-09-30T10:00:00.000Z",
      "Configured PRIORITY_REFERENCE_DATE environment variable is respected"
    );

    // 5E. Invalid configured PRIORITY_REFERENCE_DATE falls back safely to system clock
    process.env.PRIORITY_REFERENCE_DATE = "not-a-valid-date-string";
    const invalidEnvBefore = Date.now();
    const invalidEnvResolved = await getEffectiveReferenceDate();
    const invalidEnvAfter = Date.now();
    assert(
      invalidEnvResolved.getTime() >= invalidEnvBefore &&
        invalidEnvResolved.getTime() <= invalidEnvAfter,
      "Invalid PRIORITY_REFERENCE_DATE safely falls back to current system clock without NaN"
    );

    // 5F. Invalid explicit override falls back safely
    // 5G. Synchronous resolver helper matches async resolver
    const syncResolved = resolveReferenceDateSync(customDate);
    assert(
      syncResolved.getTime() === customDate.getTime(),
      "resolveReferenceDateSync strictly matches explicit override date"
    );
  } finally {
    // Restore env
    if (origEnvRef !== undefined) {
      process.env.PRIORITY_REFERENCE_DATE = origEnvRef;
    } else {
      delete process.env.PRIORITY_REFERENCE_DATE;
    }
  }

  // -------------------------------------------------------------------------
  // 6. Cross-Cluster Isolation Under New Live Complaints
  // -------------------------------------------------------------------------
  console.log("\n6. Live Complaint Temporal Isolation (Unrelated Cluster Independence):");

  // Cluster A: Water Supply issue reported 5 days ago
  const now = new Date();
  const cClusterA = makeComplaint(new Date(now.getTime() - 5 * ONE_DAY_MS), {
    category: "Water Supply & Sanitation",
    subcategory: "Pipeline Leakage",
    location: "Ward 4 - Sector 2",
  });

  const clusterAGroup: RawClusterGroup = {
    clusterKey: "water_supply:::pipeline_leakage:::ward 4",
    title: "Pipeline Leakage",
    category: "Water Supply & Sanitation",
    subcategory: "Pipeline Leakage",
    wardIds: ["Ward 4"],
    complaints: [cClusterA],
  };

  const initialScoreClusterA = calculateClusterPriority(clusterAGroup, 100, now);

  // Now simulate a brand new live complaint arriving for Cluster B at the current moment:
  const cClusterB = makeComplaint(now, {
    category: "Street Lighting",
    subcategory: "Dark Spots",
    location: "Ward 12 - Main Road",
  });
  const clusterBGroup: RawClusterGroup = {
    clusterKey: "street_lighting:::dark_spots:::ward 12",
    title: "Dark Spots",
    category: "Street Lighting",
    subcategory: "Dark Spots",
    wardIds: ["Ward 12"],
    complaints: [cClusterB],
  };
  const scoreClusterB = calculateClusterPriority(clusterBGroup, 100, now);
  assert(
    scoreClusterB.priorityScore > 0,
    "Cluster B is evaluated independently and receives valid score"
  );

  // Verify that Cluster A's deterministic priority score and trend are completely unchanged:
  const postNewComplaintScoreClusterA = calculateClusterPriority(clusterAGroup, 100, now);

  assert(
    initialScoreClusterA.priorityScore === postNewComplaintScoreClusterA.priorityScore,
    "Unrelated Cluster A priority score remains identical after new live complaint arrives"
  );
  assert(
    initialScoreClusterA.evidence.recentCount === postNewComplaintScoreClusterA.evidence.recentCount,
    "Unrelated Cluster A recentCount remains identical after new live complaint arrives"
  );
  assert(
    initialScoreClusterA.trendScore === postNewComplaintScoreClusterA.trendScore,
    "Unrelated Cluster A trendScore remains identical after new live complaint arrives"
  );

  // -------------------------------------------------------------------------
  // 7. Consistency Between Dashboard Timeline & Priority Trend Window
  // -------------------------------------------------------------------------
  console.log("\n7. Dashboard Timeline & Priority Trend Window Consistency:");
  assert(
    TEMPORAL_CONFIG.recentTrendDays + TEMPORAL_CONFIG.previousTrendDays ===
      TEMPORAL_CONFIG.trendTimelineDays,
    "Trend timeline (28 days) exactly equals recent (14d) + previous (14d) windows"
  );

  console.log("\n=================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTemporalTests();
