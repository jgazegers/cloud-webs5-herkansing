import mongoose from "mongoose";
import { ISubmission, IValidCompetition } from "../types";

const SubmissionSchema = new mongoose.Schema<ISubmission>(
  {
    competitionId: {
      type: String,
      required: true,
    },
    owner: {
      type: String,
      required: true,
    },
    submissionData: {
      type: String,
      required: true,
    },
    similarityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    comparisonStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    comparisonError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const ValidCompetitionSchema = new mongoose.Schema<IValidCompetition>(
  {
    competitionId: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    owner: {
      type: String,
      required: true,
    },
    targetImage: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

export const Submission = mongoose.model<ISubmission>("Submission", SubmissionSchema);
export const ValidCompetition = mongoose.model<IValidCompetition>("ValidCompetition", ValidCompetitionSchema);
