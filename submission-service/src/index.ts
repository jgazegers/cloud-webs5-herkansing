import express from "express";
import { connectToDatabase } from "./config/database";
import { eventService } from "./services/eventServiceSingleton";
import submissionRoutes from "./routes/submissionRoutes";
import "./types"; // Import types to ensure global declarations are loaded

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3003;

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectToDatabase();
    
    // Initialize message queue in background
    await eventService.initialize();
    
    // Setup routes
    app.use("/", submissionRoutes);
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Submission service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown handlers
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down gracefully`);
  try {
    await eventService.close();
    process.exit(0);
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();
