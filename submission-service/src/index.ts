import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { MessageQueue, CompetitionCreatedEvent } from "./messageQueue";

// Extend Express Request interface to include 'username' and multer file
declare global {
  namespace Express {
    interface Request {
      username?: string;
      file?: Express.Multer.File; // Use multer's File type for uploaded files
    }
  }
}

// Helper function to validate base64 image
function isValidBase64Image(base64String: string): boolean {
  // Check if it's a valid base64 data URL for images
  const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp|bmp);base64,([A-Za-z0-9+/=]+)$/;
  return base64Regex.test(base64String);
}

// Helper function to get image info from base64
function getImageInfo(base64String: string): { type: string; size: number } | null {
  if (!isValidBase64Image(base64String)) return null;
  
  const matches = base64String.match(/^data:image\/([^;]+);base64,(.+)$/);
  if (!matches) return null;
  
  const [, type, data] = matches;
  const size = Math.ceil(data.length * 0.75); // Approximate size in bytes
  
  return { type, size };
}

// Maximum file size (5MB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads/submissions';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'submission-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept only images
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE // 5MB limit
  },
  fileFilter: fileFilter
});

interface ISubmission {
  competitionId: string;
  owner: string;
  submissionData: string; // base64 encoded image
}

interface ISubmissionInput {
  competitionId: string;
  submissionData: string; // base64 encoded image
  // userId will be extracted from JWT token, not from request body
}

// Schema for tracking valid competition IDs
interface IValidCompetition {
  competitionId: string;
  title: string;
  owner: string;
  createdAt: Date;
}

const SubmissionSchema = new mongoose.Schema<ISubmission>(
  {
    competitionId: {
      type: String,
      required: true,
    },
    owner: {
      type: String,
      required: true,
    },
    submissionData: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const ValidCompetitionSchema = new mongoose.Schema<IValidCompetition>(
  {
    competitionId: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    owner: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const Submission = mongoose.model<ISubmission>("Submission", SubmissionSchema);
const ValidCompetition = mongoose.model<IValidCompetition>("ValidCompetition", ValidCompetitionSchema);

// JWT middleware to extract username from token
export const authenticateInternalToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET_INTERNAL || "your-secret-key"
    ) as any;
    req.username = decoded.username; // Extract username from JWT payload
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3003;

// Initialize message queue
const messageQueue = new MessageQueue();

// Function to handle competition created events
async function handleCompetitionCreated(event: CompetitionCreatedEvent): Promise<void> {
  try {
    const validCompetition = new ValidCompetition({
      competitionId: event.competitionId,
      title: event.title,
      owner: event.owner,
      createdAt: event.createdAt,
    });
    
    await validCompetition.save();
    console.log(`Stored valid competition ID: ${event.competitionId}`);
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error - competition already exists
      console.log(`Competition ${event.competitionId} already exists in cache`);
    } else {
      console.error('Error storing competition:', error);
      throw error;
    }
  }
}

// Connect to MongoDB
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://mongo:27017/submission-service"
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

// Connect to RabbitMQ and subscribe to events with startup retry logic
async function initializeMessageQueue() {
  try {
    await messageQueue.connect();
    await messageQueue.subscribeToCompetitionEvents(handleCompetitionCreated);
  } catch (error) {
    console.error("Failed to connect to RabbitMQ during startup:", error);
    console.log("🚨 Service will continue without messaging. Competition validation will rely on existing cache only.");
  }
}

// Initialize message queue in background
initializeMessageQueue();

app.post("/", authenticateInternalToken, upload.single('submissionData'), async (req, res) => {
  try {
    // Handle both form-data and JSON input
    let submissionData: any;
    let base64Image: string;

    if (req.file) {
      // Form-data submission with file upload
      submissionData = {
        competitionId: req.body.competitionId,
      };
      // Convert uploaded file to base64
      const { path: filePath, mimetype } = req.file;
      base64Image = fileToBase64(filePath, mimetype);
      
      // Clean up the uploaded file after conversion
      fs.unlinkSync(filePath);
    } else {
      // JSON submission with base64 image
      submissionData = req.body;
      base64Image = submissionData.submissionData;
    }

    // Validate required fields
    if (!submissionData.competitionId || !base64Image) {
      res.status(400).json({ 
        error: "Missing required fields: competitionId and submissionData are required" 
      });
      return;
    }

    // Check if the competition exists in our local cache
    const validCompetition = await ValidCompetition.findOne({ 
      competitionId: submissionData.competitionId 
    });

    if (!validCompetition) {
      res.status(400).json({ 
        error: "Invalid competition ID. Competition does not exist or is not accepting submissions." 
      });
      return;
    }

    // Validate and get info from base64 image
    const imageInfo = getImageInfo(base64Image);
    if (!imageInfo) {
      res.status(400).json({ error: "Invalid image data. Must be a valid base64-encoded image." });
      return;
    }

    // Check image size
    if (imageInfo.size > MAX_IMAGE_SIZE) {
      res.status(400).json({ error: "Image size exceeds the 5MB limit." });
      return;
    }

    const submission = new Submission({
      ...submissionData,
      owner: req.username, // Set owner from JWT token
      submissionData: base64Image // Save as base64 string
    });

    await submission.save();
    res.status(201).json({
      ...submission.toObject(),
      competitionTitle: validCompetition.title,
      imageInfo: {
        type: imageInfo.type,
        size: imageInfo.size
      }
    });
  } catch (error) {
    console.error("Error saving submission:", error);
    res.status(500).json({ error: "Failed to save submission" });
  }
});

// GET endpoint to retrieve submissions for a competition
app.get("/competition/:competitionId", authenticateInternalToken, async (req, res) => {
  try {
    const { competitionId } = req.params;
    
    const submissions = await Submission.find({ competitionId })
      .select('-__v') // Exclude version field
      .sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json({
      competitionId,
      totalSubmissions: submissions.length,
      submissions: submissions.map(submission => ({
        ...submission.toObject(),
        // Truncate base64 image data in list view for performance
        submissionData: submission.submissionData.substring(0, 100) + '...[truncated]'
      }))
    });
  } catch (error) {
    console.error("Error retrieving submissions:", error);
    res.status(500).json({ error: "Failed to retrieve submissions" });
  }
});

// GET endpoint to retrieve a specific submission with full image data
app.get("/:submissionId", authenticateInternalToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    const submission = await Submission.findById(submissionId).select('-__v');
    
    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    // Get image info
    const imageInfo = getImageInfo(submission.submissionData);

    res.status(200).json({
      ...submission.toObject(),
      imageInfo: imageInfo || { type: 'unknown', size: 0 }
    });
  } catch (error) {
    console.error("Error retrieving submission:", error);
    res.status(500).json({ error: "Failed to retrieve submission" });
  }
});

// GET endpoint to retrieve user's own submissions
app.get("/user/my-submissions", authenticateInternalToken, async (req, res) => {
  try {
    const submissions = await Submission.find({ owner: req.username })
      .select('-__v')
      .sort({ createdAt: -1 });

    res.status(200).json({
      totalSubmissions: submissions.length,
      submissions: submissions.map(submission => {
        const imageInfo = getImageInfo(submission.submissionData);
        return {
          ...submission.toObject(),
          imageInfo: imageInfo || { type: 'unknown', size: 0 },
          // Truncate base64 for list view
          submissionData: submission.submissionData.substring(0, 100) + '...[truncated]'
        };
      })
    });
  } catch (error) {
    console.error("Error retrieving user submissions:", error);
    res.status(500).json({ error: "Failed to retrieve user submissions" });
  }
});

app.listen(PORT, () => {
  console.log(`Submission service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await messageQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await messageQueue.close();
  process.exit(0);
});

// Helper function to convert file to base64
function fileToBase64(filePath: string, mimeType: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const base64String = fileBuffer.toString('base64');
  return `data:${mimeType};base64,${base64String}`;
}
