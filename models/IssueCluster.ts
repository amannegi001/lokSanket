import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClusterEvidence {
  reportCount: number;
  affectedLocalities: number;
  localities: string[];
  photoEvidenceCount: number;
  trendPercent: number;
  recentCount: number;
  previousCount: number;
  severityBreakdown: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  affectedGroups: string[];
  demandVolumeScore: number;
  severityScore: number;
  trendScore: number;
  geographicScore: number;
  evidenceScore: number;
  priorityScore: number;
}

export interface IIssueCluster extends Document {
  title: string;
  category: string;
  subcategory: string;
  wardIds: string[];
  complaintIds: mongoose.Types.ObjectId[];
  reportCount: number;
  severityScore: number;
  trendScore: number;
  geographicScore: number;
  evidenceScore: number;
  priorityScore: number;
  priorityLevel: "High" | "Medium" | "Low";
  evidence: IClusterEvidence;
  aiExplanation?: string;
  officialDecision?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClusterEvidenceSchema = new Schema<IClusterEvidence>(
  {
    reportCount: { type: Number, required: true },
    affectedLocalities: { type: Number, required: true },
    localities: { type: [String], default: [] },
    photoEvidenceCount: { type: Number, required: true },
    trendPercent: { type: Number, required: true },
    recentCount: { type: Number, required: true },
    previousCount: { type: Number, required: true },
    severityBreakdown: {
      low: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      critical: { type: Number, default: 0 },
    },
    affectedGroups: { type: [String], default: [] },
    demandVolumeScore: { type: Number, required: true },
    severityScore: { type: Number, required: true },
    trendScore: { type: Number, required: true },
    geographicScore: { type: Number, required: true },
    evidenceScore: { type: Number, required: true },
    priorityScore: { type: Number, required: true },
  },
  { _id: false }
);

const IssueClusterSchema = new Schema<IIssueCluster>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    wardIds: {
      type: [String],
      default: [],
      index: true,
    },
    complaintIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Complaint",
      },
    ],
    reportCount: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
    severityScore: {
      type: Number,
      required: true,
      default: 0,
    },
    trendScore: {
      type: Number,
      required: true,
      default: 0,
    },
    geographicScore: {
      type: Number,
      required: true,
      default: 0,
    },
    evidenceScore: {
      type: Number,
      required: true,
      default: 0,
    },
    priorityScore: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
    priorityLevel: {
      type: String,
      enum: ["High", "Medium", "Low"],
      required: true,
      default: "Low",
      index: true,
    },
    evidence: {
      type: ClusterEvidenceSchema,
      required: true,
    },
    aiExplanation: {
      type: String,
      trim: true,
    },
    officialDecision: {
      type: String,
      enum: [
        "pending_review",
        "approved_for_action",
        "in_progress",
        "deferred",
        "resolved",
      ],
      default: "pending_review",
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const IssueCluster: Model<IIssueCluster> =
  mongoose.models.IssueCluster ||
  mongoose.model<IIssueCluster>("IssueCluster", IssueClusterSchema);

export default IssueCluster;
