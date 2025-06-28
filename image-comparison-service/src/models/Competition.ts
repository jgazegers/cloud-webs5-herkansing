// src/models/Competition.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ICompetition extends Document {
  _id: string;
  targetImage: string; // base64 encoded image - the only data we need for comparison
  createdAt: Date;
  updatedAt: Date;
}

const CompetitionSchema: Schema = new Schema({
  _id: {
    type: String,
    required: true
  },
  targetImage: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  _id: false // We're providing our own _id
});

export const Competition = mongoose.model<ICompetition>('Competition', CompetitionSchema);
