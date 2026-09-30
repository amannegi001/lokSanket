import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReview extends Document {
  clusterId: mongoose.Types.ObjectId;
  decision: "accept" | "adjust" | "reject";
  note?: string;
  adjustedPriorityLevel?: "high" | "medium" | "low";
  reviewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    clusterId: {
      type: Schema.Types.ObjectId,
      ref: "IssueCluster",
      required: true,
      index: true,
    },
    decision: {
      type: String,
      enum: ["accept", "adjust", "reject"],
      required: true,
      index: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    adjustedPriorityLevel: {
      type: String,
      enum: ["high", "medium", "low"],
      default: undefined,
    },
    reviewedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);

export default Review;
