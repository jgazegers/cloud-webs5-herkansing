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
