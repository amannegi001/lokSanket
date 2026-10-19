import {
  calculateDemandVolumeScore,
  calculateSeverityScore,
  calculateTrendScore,
  calculateGeographicConcentrationScore,
  calculateEvidenceStrengthScore,
  calculateClusterPriority,
  classifyPriority,
  getPriorityLevel,
  isValidPriorityScore,
  PRIORITY_CONFIG,
} from "../lib/priority";
import { RawClusterGroup } from "../lib/clustering";
import { IComplaint } from "../models/Complaint";

function makeSyntheticComplaint(overrides: Partial<IComplaint>): IComplaint {
  return {
    rawText: "Sample test complaint",
    language: "english",
    category: "Road Infrastructure",
    subcategory: "Potholes / Road Damage",
    summary: "Test summary",
    severity: "medium",
    affectedGroups: ["residents"],
    keywords: ["test"],
    location: "Ward 1 - Sector 1",
    status: "new",
    createdAt: new Date(),
    ...overrides,
  } as IComplaint;
}

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

function runEdgeCaseTests() {
  console.log("=================================================");
  console.log("🧪 Deterministic Priority Engine Edge-Case Unit Tests");
  console.log("=================================================\n");

  const refDate = new Date();
  const daysAgoMs = (days: number) => new Date(refDate.getTime() - days * 24 * 60 * 60 * 1000);

  // -------------------------------------------------------------------------
  // Test 1: Zero Reports
  // -------------------------------------------------------------------------
  console.log("Test 1: Zero Reports Edge Case");
  const demandZero = calculateDemandVolumeScore(0, 100);
  const severityZero = calculateSeverityScore({ low: 0, medium: 0, high: 0, critical: 0 });
  const trendZero = calculateTrendScore(0, 0);
  const geoZero = calculateGeographicConcentrationScore([], {}, 0);
  const evidenceZero = calculateEvidenceStrengthScore({
    reportCount: 0,
    photoEvidenceCount: 0,
    affectedLocalities: 0,
    highCount: 0,
    criticalCount: 0,
  });

  assert(demandZero.score === 0, "Demand volume score for 0 reports is 0");
  assert(severityZero.score === 0, "Severity score for 0 reports is 0");
  assert(trendZero.score === 50, "Trend score for 0 reports is 50 (neutral/baseline)");
  assert(geoZero.score === 0, "Geographic score for 0 reports is 0");
  assert(evidenceZero.score === 0, "Evidence score for 0 reports is 0");
  assert(!Number.isNaN(trendZero.score), "Trend score is not NaN");

  // -------------------------------------------------------------------------
  // Test 2: One Single Report
  // -------------------------------------------------------------------------
  console.log("\nTest 2: One Single Report");
  const singleComplaint = makeSyntheticComplaint({
    location: "Ward 1 - Sector 1",
    severity: "high",
    imageUrl: "/demo/photo.jpg",
    createdAt: daysAgoMs(2), // recent
  });
  const singleCluster: RawClusterGroup = {
    clusterKey: "road:::potholes:::ward 1",
    title: "Potholes — Ward 1",
    category: "Road Infrastructure",
    subcategory: "Potholes",
    wardIds: ["Ward 1"],
    complaints: [singleComplaint],
  };

  const singleResult = calculateClusterPriority(singleCluster, 100, refDate);
  assert(singleResult.reportCount === 1, "Report count is 1");
  assert(singleResult.priorityScore >= 0 && singleResult.priorityScore <= 100, "Priority score is in [0, 100]");
  assert(singleResult.demandVolumeScore === 1.0, "Demand volume score is 1.0 (1/100)");
  assert(singleResult.severityScore === 75.0, "Severity score is 75.0 for high severity");
  assert(singleResult.geographicScore === 100, "Geographic concentration is 100 for 1 single spot");
  assert(singleResult.priorityLevel === "Low", "Priority level is Low for isolated 1-report issue");

  // -------------------------------------------------------------------------
  // Test 3: Zero Previous-Period Reports (Emerging Surge)
  // -------------------------------------------------------------------------
  console.log("\nTest 3: Zero Previous-Period Reports (Emerging Surge)");
  const surgeTrend = calculateTrendScore(15, 0); // 15 recent, 0 previous
  assert(surgeTrend.score >= 80, "Emerging surge score is high (>=80)");
  assert(surgeTrend.trendPercent === 100, "Trend percent is 100% for emerging surge");
  assert(!Number.isNaN(surgeTrend.score), "Trend score avoids division by zero");

  // -------------------------------------------------------------------------
  // Test 4: Zero Recent Reports (Complete Drop-off)
  // -------------------------------------------------------------------------
  console.log("\nTest 4: Zero Recent Reports (Complete Drop-off)");
  const dropoffTrend = calculateTrendScore(0, 20); // 0 recent, 20 previous
  assert(dropoffTrend.score === 0, "Complete drop-off yields 0 trend score");
  assert(dropoffTrend.trendPercent === -100, "Trend percent is -100%");
  assert(dropoffTrend.score <= 50, "Drop-off is below neutral baseline");

  // -------------------------------------------------------------------------
  // Test 5: All Low Severity
  // -------------------------------------------------------------------------
  console.log("\nTest 5: All Low Severity");
  const allLowSeverity = calculateSeverityScore({ low: 50, medium: 0, high: 0, critical: 0 });
  assert(allLowSeverity.score === 25.0, "All low severity produces exactly 25.0 score");

  // -------------------------------------------------------------------------
  // Test 6: All Critical Severity
  // -------------------------------------------------------------------------
  console.log("\nTest 6: All Critical Severity");
  const allCritSeverity = calculateSeverityScore({ low: 0, medium: 0, high: 0, critical: 50 });
  assert(allCritSeverity.score === 100.0, "All critical severity produces exactly 100.0 score");

  // -------------------------------------------------------------------------
  // Test 7: No Photo Evidence
  // -------------------------------------------------------------------------
  console.log("\nTest 7: No Photo Evidence");
  const noPhotos = calculateEvidenceStrengthScore({
    reportCount: 30,
    photoEvidenceCount: 0,
    affectedLocalities: 3,
    highCount: 10,
    criticalCount: 5,
  });
  assert(noPhotos.score >= 0 && noPhotos.score <= 100, "No photo evidence remains bounded in [0, 100]");
  assert(noPhotos.score < 60, "No photo evidence receives lower score than with photos");

  // -------------------------------------------------------------------------
  // Test 8: Maximum Evidence Strength
  // -------------------------------------------------------------------------
  console.log("\nTest 8: Maximum Evidence Strength");
  const maxEvidence = calculateEvidenceStrengthScore({
    reportCount: 150,
    photoEvidenceCount: 40, // >25% photos
    affectedLocalities: 8,  // >=5 localities
    highCount: 80,
    criticalCount: 70,      // 100% high/critical
  });
  assert(maxEvidence.score >= 90, "Maximum evidence produces score >= 90");
  assert(maxEvidence.score <= 100, "Maximum evidence does not exceed 100");

  // -------------------------------------------------------------------------
  // Test 9: Geographically Concentrated Cluster (1 Locality)
  // -------------------------------------------------------------------------
  console.log("\nTest 9: Geographically Concentrated Cluster");
  const concentratedGeo = calculateGeographicConcentrationScore(
    ["Main Chowk Junction"],
    { "Main Chowk Junction": 50 },
    50
  );
  assert(concentratedGeo.score === 100, "Single locality concentration is 100");
  assert(concentratedGeo.hhi === 1.0, "HHI is 1.0 for single locality");

  // -------------------------------------------------------------------------
  // Test 10: Geographically Distributed Cluster (25 Dispersed Localities)
  // -------------------------------------------------------------------------
  console.log("\nTest 10: Geographically Distributed Cluster (25 Localities)");
  const dispersedLocalities: string[] = [];
  const dispersedCounts: Record<string, number> = {};
  for (let i = 1; i <= 25; i++) {
    const loc = `Locality ${i}`;
    dispersedLocalities.push(loc);
    dispersedCounts[loc] = 2; // 2 reports each (50 total)
  }
  const dispersedGeo = calculateGeographicConcentrationScore(
    dispersedLocalities,
    dispersedCounts,
    50
  );
  assert(dispersedGeo.score <= 25, "25 dispersed localities produces low concentration score (<=25)");
  assert(dispersedGeo.hhi === 0.04, "HHI is 0.04 (1/25) for equal dispersion");

  // -------------------------------------------------------------------------
  // Test 11: Exact Boundary Value Tests
  // -------------------------------------------------------------------------
  console.log("\nTest 11: Exact Boundary Value Tests");
  const boundaryCases = [
    { score: 0, expected: "Low" },
    { score: 39.9, expected: "Low" },
    { score: 59.9, expected: "Low" },
    { score: 60, expected: "Medium" },
    { score: 69.9, expected: "Medium" },
    { score: 79.9, expected: "Medium" },
    { score: 80, expected: "High" },
    { score: 99.9, expected: "High" },
    { score: 100, expected: "High" },
  ] as const;

  for (const { score, expected } of boundaryCases) {
    const level = classifyPriority(score);
    assert(level === expected, `Score ${score} -> ${expected} (got: ${level})`);
  }

  // Also verify alias getPriorityLevel behaves identically
  assert(getPriorityLevel(80) === "High", "getPriorityLevel alias works identically for High");
  assert(getPriorityLevel(60) === "Medium", "getPriorityLevel alias works identically for Medium");
  assert(getPriorityLevel(0) === "Low", "getPriorityLevel alias works identically for Low");

  // -------------------------------------------------------------------------
  // Test 12: Unrounded Classification Precision (No Rounding Before Classification)
  // -------------------------------------------------------------------------
  console.log("\nTest 12: Unrounded Classification Precision");
  // 59.999 is strictly < 60 -> Low. If rounded to 60, it would incorrectly be Medium.
  assert(
    classifyPriority(59.999) === "Low",
    "Score 59.999 is Low (unrounded precision strictly respected)"
  );
  // 79.999 is strictly < 80 -> Medium. If rounded to 80, it would incorrectly be High.
  assert(
    classifyPriority(79.999) === "Medium",
    "Score 79.999 is Medium (unrounded precision strictly respected)"
  );
  assert(
    classifyPriority(59.5) === "Low",
    "Score 59.5 is Low (Math.round(59.5) would be 60, but raw score is <60)"
  );

  // -------------------------------------------------------------------------
  // Test 13: Invalid Input Safety (Throws rather than silently mislabeling)
  // -------------------------------------------------------------------------
  console.log("\nTest 13: Invalid Input Safety");
  const invalidInputs = [
    { val: -0.1, label: "negative value -0.1" },
    { val: -10, label: "negative value -10" },
    { val: 100.1, label: "value above 100 (100.1)" },
    { val: 150, label: "value above 100 (150)" },
    { val: NaN, label: "NaN" },
    { val: Infinity, label: "Infinity" },
    { val: -Infinity, label: "-Infinity" },
    { val: null, label: "null" },
    { val: undefined, label: "undefined" },
    { val: "85.4", label: "string '85.4'" },
    { val: {}, label: "object {}" },
    { val: [], label: "array []" },
  ];

  for (const item of invalidInputs) {
    let threw = false;
    try {
      classifyPriority(item.val);
    } catch (err: unknown) {
      threw = err instanceof TypeError || err instanceof RangeError || err instanceof Error;
    }
    assert(threw, `Invalid score (${item.label}) safely throws error instead of silently receiving a label`);
    assert(!isValidPriorityScore(item.val), `isValidPriorityScore returns false for ${item.label}`);
  }

  // Safe mode option
  assert(
    classifyPriority(-5, { safe: true, fallback: "Low" }) === "Low",
    "Safe mode returns specified fallback for negative score"
  );
  assert(
    classifyPriority(150, { safe: true, fallback: "Medium" }) === "Medium",
    "Safe mode returns specified fallback for score above 100"
  );
  assert(
    classifyPriority("invalid", { safe: true, fallback: "Low" }) === "Low",
    "Safe mode returns fallback for non-numeric input"
  );

  // Valid score validation checks
  assert(isValidPriorityScore(0), "isValidPriorityScore(0) is true");
  assert(isValidPriorityScore(59.5), "isValidPriorityScore(59.5) is true");
  assert(isValidPriorityScore(80), "isValidPriorityScore(80) is true");
  assert(isValidPriorityScore(100), "isValidPriorityScore(100) is true");

  // -------------------------------------------------------------------------
  // Test 14: Authoritative Priority Benchmark Examples (Audit Specification)
  // -------------------------------------------------------------------------
  console.log("\nTest 14: Authoritative Priority Benchmark Examples");
  const authoritativeExamples = [
    { score: 85.4, expected: "High", label: "Road Damage & Potholes (85.4)" },
    { score: 80.0, expected: "High", label: "Exact High Threshold Boundary (80.0)" },
    { score: 79.9, expected: "Medium", label: "Upper Medium Boundary (79.9)" },
    { score: 78.0, expected: "Medium", label: "Overflowing Open Drains (78.0)" },
    { score: 65.3, expected: "Medium", label: "Unattended Garbage Dumps (65.3)" },
    { score: 61.6, expected: "Medium", label: "Transformer Overload & Fluctuations (61.6)" },
    { score: 60.0, expected: "Medium", label: "Exact Medium Threshold Boundary (60.0)" },
    { score: 59.9, expected: "Low", label: "Upper Low Boundary (59.9)" },
    { score: 59.5, expected: "Low", label: "Blocked Stormwater Drains (59.5)" },
    { score: 0, expected: "Low", label: "Zero Priority Score (0)" },
  ] as const;

  for (const ex of authoritativeExamples) {
    const level = classifyPriority(ex.score);
    assert(
      level === ex.expected,
      `${ex.label} (Score: ${ex.score}) -> Expected: ${ex.expected}, Got: ${level}`
    );
  }

  // -------------------------------------------------------------------------
  // Global Bounds & Weight Validation
  // -------------------------------------------------------------------------
  console.log("\nGlobal Weights & Classification Audit:");
  const sumWeights =
    PRIORITY_CONFIG.weights.demandVolume +
    PRIORITY_CONFIG.weights.severity +
    PRIORITY_CONFIG.weights.recentTrend +
    PRIORITY_CONFIG.weights.geographicConcentration +
    PRIORITY_CONFIG.weights.evidenceStrength;

  assert(Math.abs(sumWeights - 1.0) < 0.0001, "Configured weights sum exactly to 1.0 (100%)");
  assert(PRIORITY_CONFIG.thresholds.high === 80, "High threshold is 80");
  assert(PRIORITY_CONFIG.thresholds.medium === 60, "Medium threshold is 60");

  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${testsPassed} passed, ${testsFailed} failed`);
  console.log("=================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runEdgeCaseTests();
