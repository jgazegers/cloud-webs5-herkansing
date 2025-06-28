import express from "express";
import { MessageQueue } from "./messageQueue";
import { connectToDatabase } from "./config/database";
import { createCompetitionRoutes } from "./routes/competitionRoutes";
import "./types/express";

const app = express();

// Initialize message queue
const messageQueue = new MessageQueue();

// Connect to MongoDB
connectToDatabase();

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

// Middleware
app.use(express.json());

// Routes
app.use("/", createCompetitionRoutes(messageQueue));

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

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Competition service running on port ${PORT}`);
});
