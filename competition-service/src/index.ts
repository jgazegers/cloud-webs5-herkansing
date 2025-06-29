import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { MessageQueue } from "./messageQueue";
import { connectToDatabase } from "./config/database";
import { createCompetitionRoutes } from "./routes/competitionRoutes";
import { WinnerEventHandler } from "./services/winnerEventHandler";
import "./types/express";

const app = express();

// Initialize message queue
const messageQueue = new MessageQueue();
const winnerEventHandler = new WinnerEventHandler();

// Connect to MongoDB
async function initializeDatabase() {
  try {
    await connectToDatabase();
    console.log("✅ Database connection established");
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1);
  }
}

// Connect to RabbitMQ with startup retry logic
async function initializeMessageQueue() {
  try {
    console.log("🔌 Connecting to RabbitMQ...");
    await messageQueue.connect();
    await messageQueue.setupWinnerConsumer(
      winnerEventHandler.handleWinnerSelected.bind(winnerEventHandler)
    );
    console.log("✅ Message queue initialized and consumers set up");
  } catch (error) {
    console.error("❌ Failed to connect to RabbitMQ during startup:", error);
    console.log(
      "🚨 Service will continue without messaging. Competitions will be created but events won't be published."
    );
  }
}

// Initialize message queue in background
// Note: This will be called from startServer()

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'competition-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use("/", createCompetitionRoutes(messageQueue));

// Graceful shutdown handlers
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
  try {
    await messageQueue.close();
    console.log('✅ Competition Service stopped successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown('SIGTERM'));
process.on("SIGINT", () => gracefulShutdown('SIGINT'));

async function startServer(): Promise<void> {
  console.log('🚀 Starting Competition Service...');
  
  try {
    // Connect to database
    await initializeDatabase();
    
    // Initialize message queue in background
    await initializeMessageQueue();
    
    // Start HTTP server
    const PORT = process.env.PORT || 3002;
    app.listen(PORT, () => {
      console.log(`✅ Competition Service started successfully`);
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`📋 Service capabilities:`);
      console.log(`   • Competition creation and management`);
      console.log(`   • Image upload and validation`);
      console.log(`   • Event publishing to message queue`);
      console.log(`   • Winner notification handling`);
      console.log(`   • Health checks and monitoring`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start Competition Service:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
