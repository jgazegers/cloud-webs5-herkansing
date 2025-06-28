// src/models/ComparisonResult.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IComparisonResult extends Document {
  submissionId: string;
  competitionId: string;
  score: number; // Similarity score from 0 to 100
  imaggaResponse?: any; // Raw response from Imagga API for debugging
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ComparisonResultSchema: Schema = new Schema({
  submissionId: {
    type: String,
    required: true,
    unique: true
  },
  competitionId: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  imaggaResponse: {
    type: Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
ComparisonResultSchema.index({ competitionId: 1, score: -1 });
ComparisonResultSchema.index({ submissionId: 1 });

export const ComparisonResult = mongoose.model<IComparisonResult>('ComparisonResult', ComparisonResultSchema);
