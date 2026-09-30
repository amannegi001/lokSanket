import mongoose, { Schema, Document, Model } from "mongoose";

export interface IComplaint extends Document {
  rawText: string;
  language: string;
  normalizedText?: string;
  category: string;
  subcategory: string;
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  affectedGroups: string[];
  keywords: string[];
  location?: string;
  imageUrl?: string;
  imageUrls?: string[];
  clusterId?: mongoose.Types.ObjectId | string | null;
  createdAt: Date;
  status: "new" | "clustered" | "prioritized" | "reviewed" | "resolved";
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    rawText: {
      type: String,
      required: [true, "Complaint text is required"],
      trim: true,
    },
    language: {
      type: String,
      default: "unknown",
      trim: true,
    },
    normalizedText: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      required: [true, "Subcategory is required"],
      trim: true,
    },
    summary: {
      type: String,
      required: [true, "Summary is required"],
      trim: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    affectedGroups: {
      type: [String],
      default: [],
    },
    keywords: {
      type: [String],
      default: [],
      index: true,
    },
    location: {
      type: String,
      trim: true,
      index: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    imageUrls: {
      type: [String],
      default: [],
    },
    clusterId: {
      type: Schema.Types.Mixed,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["new", "clustered", "prioritized", "reviewed", "resolved"],
      default: "new",
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

export const Complaint: Model<IComplaint> =
  mongoose.models.Complaint ||
  mongoose.model<IComplaint>("Complaint", ComplaintSchema);

export default Complaint;
