export interface ISubmission {
  competitionId: string;
  owner: string;
  submissionData: string; // base64 encoded image
  similarityScore?: number; // Score from image comparison (0-100)
  comparisonStatus?: 'pending' | 'completed' | 'failed'; // Status of comparison
  comparisonError?: string; // Error message if comparison failed
}

export interface ISubmissionInput {
  competitionId: string;
  submissionData: string; // base64 encoded image
  // userId will be extracted from JWT token, not from request body
}

export interface IValidCompetition {
  competitionId: string;
  title: string;
  owner: string;
  targetImage: string; // base64 encoded target image
  startDate?: Date; // Optional start date
  endDate?: Date; // Optional end date
  status: 'active' | 'stopped' | 'ended'; // Competition status
  createdAt: Date;
}

export interface ImageInfo {
  type: string;
  size: number;
}

// Extend Express Request interface to include 'username' and multer file
declare global {
  namespace Express {
    interface Request {
      username?: string;
      file?: Express.Multer.File; // Multer file type for uploaded files
    }
  }
}
