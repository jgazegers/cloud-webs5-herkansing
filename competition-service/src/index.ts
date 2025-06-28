// models/Competition.ts
import mongoose, { Document, Schema } from "mongoose";
import express, { Request } from "express";
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
      file?: Express.Multer.File;
    }
  }
}

// Helper function to validate base64 image
function isValidBase64Image(base64String: string): boolean {
  // Check if it's a valid base64 data URL for images
  const base64Regex =
    /^data:image\/(jpeg|jpg|png|gif|webp|bmp);base64,([A-Za-z0-9+/=]+)$/;
  return base64Regex.test(base64String);
}

// Helper function to get image info from base64
function getImageInfo(
  base64String: string
): { type: string; size: number } | null {
  if (!isValidBase64Image(base64String)) return null;

  const matches = base64String.match(/^data:image\/([^;]+);base64,(.+)$/);
  if (!matches) return null;

  const [, type, data] = matches;
  const size = Math.ceil(data.length * 0.75); // Approximate size in bytes

  return { type, size };
}

// Maximum file size (10MB for target images)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "./uploads/competitions";
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "target-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter to accept only images
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE, // 10MB limit
  },
  fileFilter: fileFilter,
});

// Helper function to convert file to base64
function fileToBase64(filePath: string, mimeType: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const base64String = fileBuffer.toString("base64");
  return `data:${mimeType};base64,${base64String}`;
}

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
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for efficient queries
CompetitionSchema.index({ startDate: 1 });
CompetitionSchema.index({ "location.coordinates": "2dsphere" }); // For geospatial queries

export const Competition = mongoose.model<ICompetition>(
  "Competition",
  CompetitionSchema
);

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

// Initialize message queue
const messageQueue = new MessageQueue();

// Connect to MongoDB
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://mongo:27017/competition-service"
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

// Connect to RabbitMQ with startup retry logic
async function initializeMessageQueue() {
  try {
    await messageQueue.connect();
  } catch (error) {
    console.error("Failed to connect to RabbitMQ during startup:", error);
    console.log(
      "🚨 Service will continue without messaging. Competitions will be created but events won't be published."
    );
  }
}

// Initialize message queue in background
initializeMessageQueue();

app.use(express.json());

app.post(
  "/",
  authenticateInternalToken,
  upload.single("targetImage"),
  async (req, res) => {
    try {
      // Handle both form-data and JSON input
      let competitionData: any;
      let targetImageBase64: string | undefined;

      if (req.file) {
        // Form-data submission with file upload
        competitionData = {
          title: req.body.title,
          description: req.body.description,
          location:
            typeof req.body.location === "string"
              ? JSON.parse(req.body.location)
              : req.body.location,
          startDate: req.body.startDate,
          endDate: req.body.endDate,
        };
        // Convert uploaded file to base64
        const { mimetype } = req.file;
        targetImageBase64 = fileToBase64(req.file.path, mimetype);

        // Clean up uploaded file after processing
        fs.unlinkSync(req.file.path);
      } else {
        // JSON submission with base64 image
        competitionData = req.body;
        targetImageBase64 = competitionData.targetImage;
      }

      // Validate required fields
      if (
        !competitionData.title ||
        !competitionData.description ||
        !targetImageBase64
      ) {
        res.status(400).json({
          error:
            "Missing required fields: title, description, and targetImage are required",
        });
        return;
      }

      // Validate base64 image format
      if (!isValidBase64Image(targetImageBase64)) {
        res.status(400).json({
          error:
            "Invalid target image format. Please provide a valid base64-encoded image (JPEG, PNG, GIF, WebP, or BMP)",
        });
        return;
      }

      // Check image size
      const imageInfo = getImageInfo(targetImageBase64);
      if (!imageInfo) {
        res.status(400).json({
          error: "Failed to process target image data",
        });
        return;
      }

      if (imageInfo.size > MAX_IMAGE_SIZE) {
        res.status(400).json({
          error: `Target image too large. Maximum size is ${
            MAX_IMAGE_SIZE / (1024 * 1024)
          }MB`,
        });
        return;
      }

      // Validate dates
      const startDate = new Date(competitionData.startDate);
      const endDate = new Date(competitionData.endDate);
      const now = new Date();

      if (startDate < now) {
        res.status(400).json({
          error: "Start date cannot be in the past",
        });
        return;
      }

      if (endDate <= startDate) {
        res.status(400).json({
          error: "End date must be after start date",
        });
        return;
      }

      const competition = new Competition({
        ...competitionData,
        targetImage: targetImageBase64, // Use base64 image data
        owner: req.username, // Set owner from JWT token
      });
      await competition.save();

      // Publish competition created event
      const event: CompetitionCreatedEvent = {
        competitionId: (competition._id as mongoose.Types.ObjectId).toString(),
        title: competition.title,
        owner: competition.owner,
        createdAt: new Date(),
      };

      try {
        await messageQueue.publishCompetitionCreated(event);
      } catch (mqError) {
        console.error("Failed to publish competition created event:", mqError);
        // Don't fail the request if message publishing fails
        // In production, you might want to store this in a dead letter queue
        console.log(
          "🚨 Competition created but event not published. Manual intervention may be required."
        );
      }

      res.status(201).json({
        ...competition.toObject(),
        targetImageInfo: {
          type: imageInfo.type,
          size: imageInfo.size,
        },
      });
    } catch (error) {
      console.error("Error creating competition:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

// GET endpoint to retrieve all competitions
app.get("/", async (req, res) => {
  try {
    const competitions = await Competition.find()
      .select("-__v")
      .sort({ createdAt: -1 });

    res.status(200).json({
      totalCompetitions: competitions.length,
      competitions: competitions.map((competition) => {
        const imageInfo = getImageInfo(competition.targetImage);
        return {
          ...competition.toObject(),
          // Truncate base64 image data in list view for performance
          targetImage:
            competition.targetImage.substring(0, 100) + "...[truncated]",
          targetImageInfo: imageInfo || { type: "unknown", size: 0 },
        };
      }),
    });
  } catch (error) {
    console.error("Error retrieving competitions:", error);
    res.status(500).json({ error: "Failed to retrieve competitions" });
  }
});

// GET endpoint to retrieve a specific competition with full image data
app.get("/:competitionId", async (req, res) => {
  try {
    const { competitionId } = req.params;

    const competition = await Competition.findById(competitionId).select(
      "-__v"
    );

    if (!competition) {
      res.status(404).json({ error: "Competition not found" });
      return;
    }

    // Get image info
    const imageInfo = getImageInfo(competition.targetImage);

    res.status(200).json({
      ...competition.toObject(),
      targetImageInfo: imageInfo || { type: "unknown", size: 0 },
    });
  } catch (error) {
    console.error("Error retrieving competition:", error);
    res.status(500).json({ error: "Failed to retrieve competition" });
  }
});

// GET endpoint to retrieve competitions by user
app.get("/user/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const competitions = await Competition.find({ owner: username })
      .select("-__v")
      .sort({ createdAt: -1 });

    res.status(200).json({
      owner: username,
      totalCompetitions: competitions.length,
      competitions: competitions.map((competition) => {
        const imageInfo = getImageInfo(competition.targetImage);
        return {
          ...competition.toObject(),
          // Truncate base64 image data in list view
          targetImage:
            competition.targetImage.substring(0, 100) + "...[truncated]",
          targetImageInfo: imageInfo || { type: "unknown", size: 0 },
        };
      }),
    });
  } catch (error) {
    console.error("Error retrieving user competitions:", error);
    res.status(500).json({ error: "Failed to retrieve user competitions" });
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await messageQueue.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await messageQueue.close();
  process.exit(0);
});

app.listen(3002, () => {
  console.log("Competition service running on port 3002");
});
