// src/models/Competition.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ICompetition extends Document {
  _id: string;
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
  owner: string;
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
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  owner: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  _id: false // We're providing our own _id
});

export const Competition = mongoose.model<ICompetition>('Competition', CompetitionSchema);
