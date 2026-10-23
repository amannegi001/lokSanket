import * as path from "path";

// Load environment variables from .env.local
try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
} catch {
  // Environment variables might already be loaded
}

import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import { Complaint } from "../models/Complaint";
import { IssueCluster } from "../models/IssueCluster";
import { assignComplaintToClusterAndRecalculate } from "../lib/priority-persistence";
import { classifyPriority } from "../lib/priority";

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

async function runClusteringTests() {
  console.log("=================================================");
  console.log("⚡ Automated Complaint Clustering & Priority Tests");
  console.log("=================================================\n");

  await connectDB();

  // Test identifiers that won't conflict with real data
  const testWardA = "Ward 99";
  const testWardB = "Ward 88";
  const testCategoryNew = "Public Safety Testing";
  const testSubcategoryNew = "Street Mirror Damage";

  const createdComplaintIds: mongoose.Types.ObjectId[] = [];
  const createdClusterIds: mongoose.Types.ObjectId[] = [];

  try {
    // -------------------------------------------------------------------------
    // Test 1: A complaint requiring a brand-new cluster
    // -------------------------------------------------------------------------
    console.log("1. New cluster creation for first-time issue in Ward:");
    const c1 = await Complaint.create({
      rawText: "Completely broken street safety mirror at main crossing in Ward 99",
      language: "english",
      category: testCategoryNew,
      subcategory: testSubcategoryNew,
      summary: "Broken safety mirror in Ward 99",
      severity: "medium",
      location: `${testWardA} - Cross Road 4`,
      status: "new",
      createdAt: new Date(),
    });
    createdComplaintIds.push(c1._id as mongoose.Types.ObjectId);

    const res1 = await assignComplaintToClusterAndRecalculate(c1._id);
    createdClusterIds.push(res1.cluster._id as mongoose.Types.ObjectId);

    assert(res1.isNewCluster === true, "Marks isNewCluster as true for new issue");
    assert(res1.cluster.wardIds.includes(testWardA), "Cluster assigned to correct Ward 99");
    assert(res1.cluster.category === testCategoryNew, "Cluster has correct category");
    assert(res1.cluster.reportCount === 1, "Cluster has reportCount = 1");
    assert(res1.cluster.complaintIds.length === 1, "Cluster has 1 complaint ID");
    assert(
      res1.cluster.complaintIds[0].toString() === c1._id.toString(),
      "Cluster contains complaint ID"
    );

    // Verify complaint document was updated
    const updatedC1 = await Complaint.findById(c1._id);
    assert(
      updatedC1?.clusterId?.toString() === res1.cluster._id.toString(),
      "Complaint.clusterId points to created cluster"
    );
    assert(updatedC1?.status === "clustered", "Complaint.status updated to 'clustered'");

    // -------------------------------------------------------------------------
    // Test 2: A new complaint matching an existing category/subcategory/ward cluster
    // -------------------------------------------------------------------------
    console.log("\n2. Complaint matching existing Ward cluster:");
    const c2 = await Complaint.create({
      rawText: "Another report: mirror shattered at crossing in Ward 99 near market",
      language: "english",
      category: testCategoryNew,
      subcategory: testSubcategoryNew,
      summary: "Shattered mirror near market Ward 99",
      severity: "high",
      location: `${testWardA} - Market Chowk`,
      imageUrl: "/test/photo.jpg",
      status: "new",
      createdAt: new Date(),
    });
    createdComplaintIds.push(c2._id as mongoose.Types.ObjectId);

    const res2 = await assignComplaintToClusterAndRecalculate(c2._id);

    assert(res2.isNewCluster === false, "Reuses existing cluster (isNewCluster === false)");
    assert(
      res2.cluster._id.toString() === res1.cluster._id.toString(),
      "Assigned to the exact same cluster ID"
    );
    assert(res2.cluster.reportCount === 2, "Cluster reportCount incremented to 2");
    assert(res2.cluster.complaintIds.length === 2, "Cluster complaintIds contains 2 items");

    // -------------------------------------------------------------------------
    // Test 3: A complaint in a different ward remaining in a separate cluster
    // -------------------------------------------------------------------------
    console.log("\n3. Cross-Ward isolation (Ward 99 vs Ward 88):");
    const c3 = await Complaint.create({
      rawText: "Broken street safety mirror in Ward 88 corner",
      language: "english",
      category: testCategoryNew,
      subcategory: testSubcategoryNew,
      summary: "Broken mirror in Ward 88",
      severity: "medium",
      location: `${testWardB} - Sector 2`,
      status: "new",
      createdAt: new Date(),
    });
    createdComplaintIds.push(c3._id as mongoose.Types.ObjectId);

    const res3 = await assignComplaintToClusterAndRecalculate(c3._id);
    createdClusterIds.push(res3.cluster._id as mongoose.Types.ObjectId);

    assert(
      res3.cluster._id.toString() !== res1.cluster._id.toString(),
      "Different ward gets a SEPARATE cluster (never merged across wards)"
    );
    assert(res3.cluster.wardIds.includes(testWardB), "Ward 88 complaint cluster has wardIds = ['Ward 88']");
    assert(!res3.cluster.wardIds.includes(testWardA), "Ward 88 cluster does not include Ward 99");

    // -------------------------------------------------------------------------
    // Test 4: Missing or ambiguous ward handling
    // -------------------------------------------------------------------------
    console.log("\n4. Missing / ambiguous location handling:");
    const c4 = await Complaint.create({
      rawText: "Street lights completely out on main boulevard with no ward given",
      language: "english",
      category: "Street Lighting",
      subcategory: "Non-Functional Streetlights",
      summary: "Streetlights dark",
      severity: "medium",
      // No location provided
      status: "new",
      createdAt: new Date(),
    });
    createdComplaintIds.push(c4._id as mongoose.Types.ObjectId);

    const res4 = await assignComplaintToClusterAndRecalculate(c4._id);
    createdClusterIds.push(res4.cluster._id as mongoose.Types.ObjectId);

    assert(
      res4.cluster.wardIds.includes("Constituency General"),
      "Missing location explicitly assigned to 'Constituency General'"
    );
    assert(
      res4.cluster.title.includes("Constituency General"),
      "Title accurately reflects 'Constituency General' without inventing data"
    );

    // -------------------------------------------------------------------------
    // Test 5: Accurate complaint IDs and report counts after assignment
    // -------------------------------------------------------------------------
    console.log("\n5. Complaint IDs and report count accuracy:");
    const fetchedCluster = await IssueCluster.findById(res2.cluster._id);
    assert(
      fetchedCluster !== null && fetchedCluster.reportCount === fetchedCluster.complaintIds.length,
      "Cluster reportCount exactly matches complaintIds array length"
    );

    // -------------------------------------------------------------------------
    // Test 6: Priority score recalculation after new complaint
    // -------------------------------------------------------------------------
    console.log("\n6. Priority score recalculation:");
    assert(
      typeof res2.cluster.priorityScore === "number" && !isNaN(res2.cluster.priorityScore),
      "Recalculated priorityScore is a valid finite number"
    );
    assert(
      res2.cluster.priorityScore >= 0 && res2.cluster.priorityScore <= 100,
      "Priority score is in [0, 100]"
    );
    assert(
      res2.cluster.priorityLevel === classifyPriority(res2.cluster.priorityScore),
      "priorityLevel strictly matches classifyPriority(priorityScore)"
    );
    assert(
      res2.cluster.evidence.photoEvidenceCount === 1,
      "Evidence photo count accurately updated from 0 to 1"
    );

    // -------------------------------------------------------------------------
    // Test 7: Duplicate prevention & idempotency
    // -------------------------------------------------------------------------
    console.log("\n7. Duplicate prevention & idempotency:");
    const resDuplicate = await assignComplaintToClusterAndRecalculate(c2._id);
    assert(
      resDuplicate.cluster.complaintIds.length === 2,
      "Re-assigning same complaint does not add duplicate ID to cluster"
    );
    assert(
      resDuplicate.cluster.reportCount === 2,
      "Re-assigning same complaint does not artificially increment reportCount"
    );

    // -------------------------------------------------------------------------
    // Test 8: Existing official decisions and reviews survive recalculation
    // -------------------------------------------------------------------------
    console.log("\n8. Preservation of official review decisions:");
    // Simulate an official accepting the Ward 99 cluster
    const reviewDate = new Date();
    await IssueCluster.findByIdAndUpdate(res2.cluster._id, {
      $set: {
        officialDecision: "approved_for_action",
        review: {
          decision: "accept",
          note: "Sanctioned immediate replacement of street safety mirror.",
          reviewedAt: reviewDate,
        },
      },
    });

    // Submit a 3rd complaint to the same cluster
    const c5 = await Complaint.create({
      rawText: "Third report: mirror is dangerous at crossing in Ward 99",
      language: "english",
      category: testCategoryNew,
      subcategory: testSubcategoryNew,
      summary: "Mirror still broken Ward 99",
      severity: "high",
      location: `${testWardA} - Cross Road 4`,
      status: "new",
      createdAt: new Date(),
    });
    createdComplaintIds.push(c5._id as mongoose.Types.ObjectId);

    const resPreserved = await assignComplaintToClusterAndRecalculate(c5._id);
    assert(
      resPreserved.cluster.officialDecision === "approved_for_action",
      "officialDecision ('approved_for_action') was PRESERVED after new complaint added"
    );
    assert(
      resPreserved.cluster.review?.decision === "accept",
      "Human review decision ('accept') was PRESERVED after new complaint added"
    );
    assert(
      resPreserved.cluster.review?.note === "Sanctioned immediate replacement of street safety mirror.",
      "Human review note was PRESERVED after new complaint added"
    );
    assert(resPreserved.cluster.reportCount === 3, "Report count updated to 3");

    // -------------------------------------------------------------------------
    // Test 9: Failure handling when clustering or persistence fails
    // -------------------------------------------------------------------------
    console.log("\n9. Failure handling:");
    let errorCaught = false;
    try {
      await assignComplaintToClusterAndRecalculate("000000000000000000000000");
    } catch {
      errorCaught = true;
    }
    assert(errorCaught === true, "Throws error safely on non-existent complaint without corrupting data");

  } finally {
    // Clean up test records
    console.log("\n🧹 Cleaning up test complaints and clusters...");
    if (createdComplaintIds.length > 0) {
      await Complaint.deleteMany({ _id: { $in: createdComplaintIds } });
    }
    if (createdClusterIds.length > 0) {
      await IssueCluster.deleteMany({ _id: { $in: createdClusterIds } });
    }
    console.log("  ✓ Cleanup complete.");
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

runClusteringTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
