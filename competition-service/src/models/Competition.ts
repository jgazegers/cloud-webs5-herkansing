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
  startDate: Date;
  endDate: Date;
  owner: string; // username from JWT token
  winnerSubmissionId?: string; // ID of the winning submission
  winnerScore?: number; // Score of the winning submission
  winnerOwner?: string; // Owner of the winning submission
  winnerSelectedAt?: Date; // When the winner was selected
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
  startDate: Date;
  endDate: Date;
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
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (this: ICompetition, value: Date) {
          return value > this.startDate;
        },
        message: "End date must be after start date",
      },
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