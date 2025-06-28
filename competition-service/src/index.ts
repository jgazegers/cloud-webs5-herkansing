// models/Competition.ts
import mongoose, { Document, Schema } from "mongoose";
import express, { Request } from "express";
import jwt from "jsonwebtoken";
import { MessageQueue, CompetitionCreatedEvent } from "./messageQueue";

// Extend Express Request interface to include 'username'
declare global {
  namespace Express {
    interface Request {
      username?: string;
    }
  }
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

app.post("/", authenticateInternalToken, async (req, res) => {
  try {
    const competitionData: ICompetitionInput = req.body;
    const competition = new Competition({
      ...competitionData,
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

    res.status(201).json(competition);
  } catch (error) {
    res.status(400).json({ error: error.message });
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
