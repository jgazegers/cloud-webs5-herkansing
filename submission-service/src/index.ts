import express from "express";
import { connectToDatabase } from "./config/database";
import { EventService } from "./services/eventService";
import submissionRoutes from "./routes/submissionRoutes";
import { specs, swaggerUi } from "./config/swagger";
import "./types"; // Import types to ensure global declarations are loaded

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3003;

// Initialize event service
const eventService = new EventService();

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectToDatabase();
    
    // Initialize message queue in background
    await eventService.initialize();
    
    // Swagger documentation setup
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        service: 'submission-service',
        timestamp: new Date().toISOString()
      });
    });
    
    // Setup routes
    app.use("/", submissionRoutes);
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Submission service running on port ${PORT}`);
      console.log(`📚 Swagger docs available at http://localhost:${PORT}/api-docs`);
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
