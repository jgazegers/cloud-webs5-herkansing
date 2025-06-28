// src/models/Submission.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ISubmission extends Document {
  _id: string;
  competitionId: string;
  owner: string;
  submissionData: string; // base64 encoded image
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema: Schema = new Schema({
  _id: {
    type: String,
    required: true
  },
  competitionId: {
    type: String,
    required: true
  },
  owner: {
    type: String,
    required: true
  },
  submissionData: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  _id: false // We're providing our own _id
});

export const Submission = mongoose.model<ISubmission>('Submission', SubmissionSchema);
