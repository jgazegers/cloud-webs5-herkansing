import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

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

const Submission = mongoose.model<ISubmission>("Submission", SubmissionSchema);

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

app.post("/", authenticateInternalToken, async (req, res) => {
  try {
    const submissionData: ISubmissionInput = req.body;
    const submission = new Submission({
      ...submissionData,
      owner: req.username, // Set owner from JWT token
    });

    // TODO: check if the competition exists

    await submission.save();
    res.status(201).json(submission);
  } catch (error) {
    console.error("Error saving submission:", error);
    res.status(500).json({ error: "Failed to save submission" });
  }
});

app.listen(PORT, () => {
  console.log(`Submission service running on port ${PORT}`);
});
