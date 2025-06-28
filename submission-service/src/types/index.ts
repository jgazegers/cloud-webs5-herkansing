export interface ISubmission {
  competitionId: string;
  owner: string;
  submissionData: string; // base64 encoded image
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
      file?: Express.Multer.File; // Use multer's File type for uploaded files
    }
  }
}
