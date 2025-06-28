// src/models/Competition.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ICompetition extends Document {
  _id: string;
  title: string;
  description: string;
  targetImage: string;
  location: {
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  startDate?: Date; // Optional
  endDate?: Date; // Optional
  status: 'active' | 'stopped' | 'ended';
  owner: string;
  winnerSubmissionId?: string; // Added to track the winning submission
  isWinnerSelected: boolean;
  stoppedAt?: Date; // When the competition was manually stopped
  createdAt: Date;
  updatedAt: Date;
}

const CompetitionSchema: Schema = new Schema({
  _id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  targetImage: {
    type: String,
    required: true
  },
  location: {
    name: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      }
    }
  },
  startDate: {
    type: Date,
    required: false
  },
  endDate: {
    type: Date,
    required: false
  },
  status: {
    type: String,
    enum: ['active', 'stopped', 'ended'],
    default: 'active',
    required: true
  },
  owner: {
    type: String,
    required: true
  },
  winnerSubmissionId: {
    type: String,
    default: null
  },
  isWinnerSelected: {
    type: Boolean,
    default: false
  },
  stoppedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  _id: false // We're providing our own _id
});

// Index for efficient queries
CompetitionSchema.index({ endDate: 1 });
CompetitionSchema.index({ isWinnerSelected: 1 });
CompetitionSchema.index({ endDate: 1, isWinnerSelected: 1 });

export const Competition = mongoose.model<ICompetition>('Competition', CompetitionSchema);
