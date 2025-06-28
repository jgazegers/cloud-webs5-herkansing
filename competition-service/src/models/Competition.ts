import mongoose, { Document, Schema } from "mongoose";

export interface ICompetition extends Document {
  title: string;
  description: string;
  targetImage: string; // base64 encoded image
  location: {
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  startDate?: Date; // Optional - competition can start immediately
  endDate?: Date; // Optional - competition can run indefinitely until manually stopped
  status: 'active' | 'stopped' | 'ended'; // Track competition status
  owner: string; // username from JWT token
  winnerSubmissionId?: string; // ID of the winning submission
  winnerScore?: number; // Score of the winning submission
  winnerOwner?: string; // Owner of the winning submission
  winnerSelectedAt?: Date; // When the winner was selected
  stoppedAt?: Date; // When the competition was manually stopped
}

export interface ICompetitionInput {
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
  // owner will be extracted from JWT token, not from request body
}

const CompetitionSchema: Schema<ICompetition> = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    targetImage: {
      type: String,
      required: true,
    }, // base64 encoded image
    location: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      coordinates: {
        latitude: {
          type: Number,
          required: true,
          min: -90,
          max: 90,
        },
        longitude: {
          type: Number,
          required: true,
          min: -180,
          max: 180,
        },
      },
    },
    startDate: {
      type: Date,
      required: false, // Made optional
    },
    endDate: {
      type: Date,
      required: false, // Made optional
      validate: {
        validator: function (this: ICompetition, value: Date) {
          // Only validate if both startDate and endDate are provided
          if (this.startDate && value) {
            return value > this.startDate;
          }
          return true;
        },
        message: "End date must be after start date",
      },
    },
    status: {
      type: String,
      enum: ['active', 'stopped', 'ended'],
      default: 'active',
      required: true,
    },
    owner: {
      type: String,
      required: true,
      trim: true,
    },
    winnerSubmissionId: {
      type: String,
      default: null,
    },
    winnerScore: {
      type: Number,
      default: null,
    },
    winnerOwner: {
      type: String,
      default: null,
    },
    winnerSelectedAt: {
      type: Date,
      default: null,
    },
    stoppedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for efficient queries
CompetitionSchema.index({ startDate: 1 });
CompetitionSchema.index({ endDate: 1 });
CompetitionSchema.index({ owner: 1 });
CompetitionSchema.index({ "location.name": "text" }); // For text search on location names
CompetitionSchema.index({ "location.coordinates": "2dsphere" }); // For geospatial queries
CompetitionSchema.index({ startDate: 1, endDate: 1 }); // Compound index for date range queries

export const Competition = mongoose.model<ICompetition>(
  "Competition",
  CompetitionSchema
);