import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MessageQueue, CompetitionCreatedEvent } from "./messageQueue";

interface ISubmission {
  competitionId: string;
  owner: string;
  submissionData: string; // base64 encoded image or other data
}

interface ISubmissionInput {
  competitionId: string;
  submissionData: string; // base64 encoded image or other data
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

app.post("/", authenticateInternalToken, async (req, res) => {
  try {
    const submissionData: ISubmissionInput = req.body;

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

    const submission = new Submission({
      ...submissionData,
      owner: req.username, // Set owner from JWT token
    });

    await submission.save();
    res.status(201).json({
      ...submission.toObject(),
      competitionTitle: validCompetition.title,
    });
  } catch (error) {
    console.error("Error saving submission:", error);
    res.status(500).json({ error: "Failed to save submission" });
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
