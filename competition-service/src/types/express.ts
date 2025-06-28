// Extend Express Request interface to include custom properties
declare global {
  namespace Express {
    interface Request {
      username?: string;
      file?: Express.Multer.File;
    }
  }
}

export {};
