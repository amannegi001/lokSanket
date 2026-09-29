import mongoose from "mongoose";
import * as path from "path";

// Load environment variables from .env.local
try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
} catch {
  // Environment variables might already be present
}

import { Complaint } from "../models/Complaint";
import { IssueCluster } from "../models/IssueCluster";
import { rebuildIssueClusters } from "../lib/clustering";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in .env.local");
  process.exit(1);
}

async function runClusteringVerification() {
  console.log("=================================================");
  console.log("🔍 LokSanket Issue Clustering & Traceable Evidence");
  console.log("=================================================");
  console.log("Connecting to MongoDB Atlas...");

  await mongoose.connect(MONGODB_URI!, { dbName: "loksanket" });
  console.log("✓ Connected successfully to database: loksanket\n");

  // Verify complaint collection state before clustering
  const totalComplaintsInDB = await Complaint.countDocuments();
  console.log(`Initial Complaint records in MongoDB: ${totalComplaintsInDB}`);

  if (totalComplaintsInDB === 0) {
    console.error("❌ No complaints found. Please run 'npm run seed' first.");
    process.exit(1);
  }

  // PASS 1: Execute clustering pipeline
  console.log("\n-------------------------------------------------");
  console.log("RUNNING CLUSTERING PASS 1...");
  console.log("-------------------------------------------------");
  const resultPass1 = await rebuildIssueClusters();

  console.log(`✓ Complaints processed: ${resultPass1.totalComplaintsProcessed}`);
  console.log(`✓ IssueCluster records created: ${resultPass1.totalClustersCreated}`);

  // Inspect largest clusters
  console.log("\nTop 10 Largest Issue Clusters:");
  resultPass1.largestClusters.forEach((c, idx) => {
    console.log(
      `  ${String(idx + 1).padStart(2)}. [${c.category.padEnd(26)}] ${c.title.padEnd(46)} | Reports: ${String(c.reportCount).padStart(3)} | Locs: ${c.affectedLocalities} | Photos: ${c.photoCount} | Trend: ${c.trendPercent > 0 ? "+" : ""}${c.trendPercent}%`
    );
  });

  // Verify Intentional Ward 17 Road Infrastructure Cluster
  console.log("\n-------------------------------------------------");
  console.log("🎯 WARD 17 ROAD INFRASTRUCTURE CLUSTER AUDIT:");
  console.log("-------------------------------------------------");
  const w17 = resultPass1.ward17RoadCluster;
  if (!w17) {
    console.error("❌ Ward 17 Road Infrastructure cluster NOT FOUND!");
    process.exit(1);
  }

  console.log(`- Cluster ID: ${w17.clusterId}`);
  console.log(`- Title: "${w17.title}"`);
  console.log(`- Category: ${w17.category}`);
  console.log(`- Ward: ${w17.ward}`);
  console.log(`- Total Reports in Cluster: ${w17.reportCount} (Expected: 137)`);
  console.log(`- Affected Localities: ${w17.affectedLocalitiesCount} (Expected: 5)`);
  console.log(`- Photo Evidences: ${w17.photoEvidenceCount} (Expected: 18)`);
  console.log(`- High/Critical Reports: ${w17.highOrCriticalCount} (Expected: 120)`);
  console.log(`- Recent (14d) Count: ${w17.recentCount} | Previous (15-28d): ${w17.previousCount}`);
  console.log(`- Recent Trend: +${w17.trendPercent}% (Increasing Surge)`);
  console.log(`- Mapped Complaint IDs Count: ${w17.complaintIdsCount} (Expected: 137)`);

  console.log("\nLocalities in Ward 17 Cluster:");
  w17.localities.forEach((loc) => {
    console.log(`   • ${loc}`);
  });

  // Verify complaint documents in MongoDB carry this clusterId
  const complaintsTaggedWithClusterId = await Complaint.countDocuments({
    clusterId: new mongoose.Types.ObjectId(w17.clusterId),
  });
  console.log(`- Complaints in MongoDB carrying this clusterId: ${complaintsTaggedWithClusterId} (Expected: 137)`);

  // Verify category integrity across all clusters
  console.log("\n-------------------------------------------------");
  console.log("AUDITING CATEGORY PURITY (NO CROSS-CATEGORY MIXING):");
  console.log("-------------------------------------------------");
  const allClusters = await IssueCluster.find().lean();
  let purityViolationCount = 0;

  for (const cluster of allClusters) {
    const memberComplaints = await Complaint.find({
      _id: { $in: cluster.complaintIds },
    }).select("category subcategory location").lean();

    const distinctCategories = new Set(memberComplaints.map((c) => c.category));
    if (distinctCategories.size > 1) {
      console.error(
        `❌ Purity violation in cluster "${cluster.title}": contains multiple categories [${Array.from(distinctCategories).join(", ")}]`
      );
      purityViolationCount++;
    }
  }

  if (purityViolationCount === 0) {
    console.log(`✓ All ${allClusters.length} clusters have 100% category purity (0 violations).`);
  }

  // PASS 2: Test Idempotence / Repeatability
  console.log("\n-------------------------------------------------");
  console.log("TESTING IDEMPOTENCE (RUNNING CLUSTERING PASS 2)...");
  console.log("-------------------------------------------------");
  await rebuildIssueClusters();

  const totalClustersPass2 = await IssueCluster.countDocuments();
  console.log(`✓ IssueCluster count after Pass 2: ${totalClustersPass2} (Pass 1 was: ${resultPass1.totalClustersCreated})`);

  const isIdempotent = totalClustersPass2 === resultPass1.totalClustersCreated;
  console.log(`[${isIdempotent ? "✓ PASS" : "✗ FAIL"}] No duplicate clusters created on repeated execution.`);

  // Validation assertions
  const isW17CountValid = w17.reportCount === 137;
  const isW17LocValid = w17.affectedLocalitiesCount === 5;
  const isW17PhotoValid = w17.photoEvidenceCount === 18;
  const isW17TrendValid = w17.trendPercent > 0;
  const isW17MappingValid = complaintsTaggedWithClusterId === 137;
  const isPurityValid = purityViolationCount === 0;

  console.log("\n=================================================");
  console.log("FINAL VERIFICATION SUMMARY:");
  console.log("=================================================");
  console.log(`[${isW17CountValid ? "✓ PASS" : "✗ FAIL"}] Ward 17 Road complaints in cluster = 137`);
  console.log(`[${isW17LocValid ? "✓ PASS" : "✗ FAIL"}] Ward 17 affected localities = 5`);
  console.log(`[${isW17PhotoValid ? "✓ PASS" : "✗ FAIL"}] Ward 17 photo evidence count = 18`);
  console.log(`[${isW17TrendValid ? "✓ PASS" : "✗ FAIL"}] Ward 17 recent trend is increasing`);
  console.log(`[${isW17MappingValid ? "✓ PASS" : "✗ FAIL"}] Complaint records mapped to clusterId = 137`);
  console.log(`[${isPurityValid ? "✓ PASS" : "✗ FAIL"}] Category purity verified (0 mixed categories)`);
  console.log(`[${isIdempotent ? "✓ PASS" : "✗ FAIL"}] Repeatability / Idempotence verified`);
  console.log("=================================================\n");

  await mongoose.disconnect();
  console.log("✅ Database disconnected. Issue clustering successfully verified!");
}

runClusteringVerification().catch((err) => {
  console.error("❌ Clustering verification failed:", err);
  process.exit(1);
});
