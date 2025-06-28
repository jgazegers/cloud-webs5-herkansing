// src/models/ComparisonResult.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IComparisonResult extends Document {
  submissionId: string;
  competitionId: string;
  score: number;
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

// Index for efficient queries - crucial for winner selection
ComparisonResultSchema.index({ competitionId: 1, score: -1, status: 1 });
ComparisonResultSchema.index({ submissionId: 1 });

export const ComparisonResult = mongoose.model<IComparisonResult>('ComparisonResult', ComparisonResultSchema);
