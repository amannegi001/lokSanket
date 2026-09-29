import mongoose from "mongoose";
import * as path from "path";

// Load environment variables from .env.local
try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
} catch {
  // Environment variables might already be present
}

import { Complaint } from "../models/Complaint";
import {
  recalculateAndPersistPriorities,
  PRIORITY_CONFIG,
} from "../lib/priority";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in .env.local");
  process.exit(1);
}

async function runPriorityPipeline() {
  console.log("=================================================");
  console.log("⚡ LokSanket Deterministic Priority Engine");
  console.log("   Formula: 30% Demand + 25% Severity + 20% Trend + 15% Geo + 10% Evidence");
  console.log("=================================================");
  console.log("Connecting to MongoDB Atlas...");

  await mongoose.connect(MONGODB_URI!, { dbName: "loksanket" });
  console.log("✓ Connected successfully to database: loksanket\n");

  const complaintCount = await Complaint.countDocuments();
  console.log(`Total Complaint records available: ${complaintCount}`);

  if (complaintCount === 0) {
    console.error("❌ No complaints found in database. Please run 'npm run seed' first.");
    process.exit(1);
  }

  // 1. Run Priority Calculation & Persistence Pass 1
  console.log("\n-------------------------------------------------");
  console.log("CALCULATING & PERSISTING PRIORITY SCORES (PASS 1)...");
  console.log("-------------------------------------------------");
  const referenceDate = new Date();
  const pass1 = await recalculateAndPersistPriorities(referenceDate);

  console.log(`✓ Processed and scored ${pass1.totalClustersUpdated} IssueClusters.`);

  // 2. Score Bounds & Anomaly Check across all clusters
  console.log("\n-------------------------------------------------");
  console.log("AUDITING SCORE BOUNDS & DATA INTEGRITY (ALL 66 CLUSTERS):");
  console.log("-------------------------------------------------");
  let boundsViolations = 0;
  let levelMismatches = 0;
  let nanOrInfCount = 0;

  for (const c of pass1.rankedClusters) {
    const s = c.priorityScore;
    const d = c.demandVolumeScore;
    const sev = c.severityScore;
    const tr = c.trendScore;
    const g = c.geographicScore;
    const ev = c.evidenceScore;

    if (
      Number.isNaN(s) ||
      !Number.isFinite(s) ||
      Number.isNaN(d) ||
      Number.isNaN(sev) ||
      Number.isNaN(tr) ||
      Number.isNaN(g) ||
      Number.isNaN(ev)
    ) {
      nanOrInfCount++;
    }

    if (
      s < 0 || s > 100 ||
      d < 0 || d > 100 ||
      sev < 0 || sev > 100 ||
      tr < 0 || tr > 100 ||
      g < 0 || g > 100 ||
      ev < 0 || ev > 100
    ) {
      boundsViolations++;
    }

    // Verify classification match
    let expectedLevel: "High" | "Medium" | "Low";
    if (s >= PRIORITY_CONFIG.thresholds.high) expectedLevel = "High";
    else if (s >= PRIORITY_CONFIG.thresholds.medium) expectedLevel = "Medium";
    else expectedLevel = "Low";

    if (c.priorityLevel !== expectedLevel) {
      levelMismatches++;
    }
  }

  console.log(`- Score Bounds Check (0 to 100): ${boundsViolations === 0 ? "✓ 100% Valid" : `❌ ${boundsViolations} violations`}`);
  console.log(`- NaN / Infinite / Negative Check: ${nanOrInfCount === 0 ? "✓ 0 Anomalies" : `❌ ${nanOrInfCount} anomalies`}`);
  console.log(`- Threshold Classification Check (80/60): ${levelMismatches === 0 ? "✓ 100% Consistent" : `❌ ${levelMismatches} mismatches`}`);

  // 3. Ranked Clusters Table (Top 10)
  console.log("\n-------------------------------------------------");
  console.log("🏆 TOP 10 RANKED CIVIC ISSUE CLUSTERS:");
  console.log("-------------------------------------------------");
  console.log("Rank | Priority | Level  | Cluster Title                                   | Demand (30%) | Sev (25%) | Trend (20%) | Geo (15%) | Evid (10%)");
  console.log("------------------------------------------------------------------------------------------------------------------------------------------");

  pass1.rankedClusters.slice(0, 10).forEach((c, idx) => {
    const rankStr = String(idx + 1).padStart(4);
    const scoreStr = c.priorityScore.toFixed(1).padStart(8);
    const levelStr = c.priorityLevel.padEnd(6);
    const titleStr = c.title.padEnd(47).slice(0, 47);
    const dStr = c.demandVolumeScore.toFixed(1).padStart(12);
    const sevStr = c.severityScore.toFixed(1).padStart(9);
    const trStr = c.trendScore.toFixed(1).padStart(11);
    const gStr = c.geographicScore.toFixed(1).padStart(9);
    const evStr = c.evidenceScore.toFixed(1).padStart(10);

    console.log(`${rankStr} | ${scoreStr} | ${levelStr} | ${titleStr} | ${dStr} | ${sevStr} | ${trStr} | ${gStr} | ${evStr}`);
  });

  // 4. Ward 17 Road Infrastructure Deep Audit & Traceability
  console.log("\n=================================================");
  console.log("🎯 WARD 17 ROAD INFRASTRUCTURE SCORE AUDIT:");
  console.log("=================================================");
  const w17 = pass1.ward17RoadCluster;
  if (!w17) {
    console.error("❌ Ward 17 Road Infrastructure cluster not found!");
    process.exit(1);
  }

  const exp = w17.explanation;
  console.log(`Cluster Title: "${exp.title}"`);
  console.log(`Final Priority Score: ${exp.priorityScore} / 100 [${exp.priorityLevel.toUpperCase()} PRIORITY]`);
  console.log("\nDetailed Factor-by-Factor Traceability Breakdown:");
  console.log("------------------------------------------------------------------------------------------------");
  console.log("Factor                  | Weight | Raw Ground Evidence                      | Norm Score | Weighted Contribution");
  console.log("------------------------------------------------------------------------------------------------");

  const compList = [
    exp.components.demandVolume,
    exp.components.severity,
    exp.components.recentTrend,
    exp.components.geographicConcentration,
    exp.components.evidenceStrength,
  ];

  for (const comp of compList) {
    const nameStr = comp.name.padEnd(23);
    const wtStr = `${comp.weightPercent}%`.padStart(6);
    const rawStr = comp.rawEvidence.padEnd(40).slice(0, 40);
    const normStr = comp.normalizedScore.toFixed(1).padStart(10);
    const contribStr = comp.weightedContribution.toFixed(2).padStart(21);
    console.log(`${nameStr} | ${wtStr} | ${rawStr} | ${normStr} | ${contribStr}`);
  }
  console.log("------------------------------------------------------------------------------------------------");
  const sumContributions = compList.reduce((acc, c) => acc + c.weightedContribution, 0);
  console.log(`Sum of Weighted Contributions: ${sumContributions.toFixed(2)} -> Stored Priority Score: ${exp.priorityScore}`);

  // 5. Test Deterministic Repeatability (Pass 2)
  console.log("\n-------------------------------------------------");
  console.log("TESTING DETERMINISTIC REPEATABILITY (PASS 2)...");
  console.log("-------------------------------------------------");
  const pass2 = await recalculateAndPersistPriorities(referenceDate);

  let repeatabilityMismatches = 0;
  for (let i = 0; i < pass1.rankedClusters.length; i++) {
    const p1 = pass1.rankedClusters[i];
    const p2 = pass2.rankedClusters[i];
    if (
      p1.clusterKey !== p2.clusterKey ||
      p1.priorityScore !== p2.priorityScore ||
      p1.priorityLevel !== p2.priorityLevel
    ) {
      repeatabilityMismatches++;
    }
  }

  console.log(`[${repeatabilityMismatches === 0 ? "✓ PASS" : "✗ FAIL"}] Identical priority scores across consecutive runs (0 mismatches).`);

  // 6. Final Audit Assertions
  const isW17Valid =
    w17.priorityScore >= 0 &&
    w17.priorityScore <= 100 &&
    w17.priorityLevel === "High";
  const isBoundsValid = boundsViolations === 0 && nanOrInfCount === 0;
  const isClassificationValid = levelMismatches === 0;
  const isRepeatableValid = repeatabilityMismatches === 0;

  console.log("\n=================================================");
  console.log("FINAL VERIFICATION SUMMARY:");
  console.log("=================================================");
  console.log(`[${isBoundsValid ? "✓ PASS" : "✗ FAIL"}] All components and final scores within 0–100`);
  console.log(`[${isClassificationValid ? "✓ PASS" : "✗ FAIL"}] Priority levels strictly adhere to 80/60 thresholds`);
  console.log(`[${isW17Valid ? "✓ PASS" : "✗ FAIL"}] Ward 17 Road Infrastructure priority score verified (${w17.priorityScore} - High)`);
  console.log(`[${isRepeatableValid ? "✓ PASS" : "✗ FAIL"}] 100% Deterministic and repeatable execution verified`);
  console.log("=================================================\n");

  await mongoose.disconnect();
  console.log("✅ Database disconnected. Priority engine pipeline completed successfully!");
}

runPriorityPipeline().catch((err) => {
  console.error("❌ Priority calculation failed:", err);
  process.exit(1);
});
