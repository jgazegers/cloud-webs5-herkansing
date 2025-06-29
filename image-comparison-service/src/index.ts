// src/index.ts
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { connectDatabase, closeDatabase } from './config/database';
import { MessageQueue } from './messageQueue';
import { EventHandlers } from './services/eventHandlers';
import { ImaggaService } from './services/imaggaService';
import { specs, swaggerUi } from './config/swagger';

const app = express();
const PORT = process.env.PORT || 3004;

// Initialize services
const messageQueue = new MessageQueue();
const eventHandlers = new EventHandlers(messageQueue);
const imaggaService = new ImaggaService();

// Basic middleware
app.use(express.json());

// Swagger documentation setup
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @swagger
 * tags:
 *   name: Image Comparison
 *   description: Internal image analysis and comparison API
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Image Comparison]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/HealthCheck'
 *                 - type: object
 *                   properties:
 *                     imaggaConfigured:
 *                       type: boolean
 *                       description: Whether Imagga API is configured
 */
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'image-comparison-service',
    timestamp: new Date().toISOString(),
    imaggaConfigured: imaggaService.isConfigured()
  });
});

// Stats endpoint to show current state
app.get('/stats', async (req, res) => {
  try {
    const { Competition, Submission, ComparisonResult } = require('./models');
    
    const stats = {
      competitions: await Competition.countDocuments(),
      submissions: await Submission.countDocuments(),
      comparisons: {
        total: await ComparisonResult.countDocuments(),
        pending: await ComparisonResult.countDocuments({ status: 'pending' }),
        completed: await ComparisonResult.countDocuments({ status: 'completed' }),
        failed: await ComparisonResult.countDocuments({ status: 'failed' })
      }
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Connect to message queue
    await messageQueue.connect();
    
    // Set up event listeners
    await messageQueue.subscribeToCompetitionEvents(
      (event) => eventHandlers.handleCompetitionCreated(event),
      (event) => eventHandlers.handleCompetitionDeleted(event)
    );
    
    await messageQueue.subscribeToSubmissionEvents(
      (event) => eventHandlers.handleSubmissionCreated(event),
      (event) => eventHandlers.handleSubmissionDeleted(event)
    );
    
    console.log('🎉 All event subscriptions set up successfully');
    
    // Check Imagga configuration
    if (imaggaService.isConfigured()) {
      console.log('✅ Imagga API is configured');
    } else {
      console.log('⚠️ Imagga API is not configured - will use mock responses');
    }
    
    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`🚀 Image Comparison Service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📈 Stats: http://localhost:${PORT}/stats`);
      console.log(`📚 API docs: http://localhost:${PORT}/api-docs`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  
  try {
    await messageQueue.close();
    await closeDatabase();
    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  
  try {
    await messageQueue.close();
    await closeDatabase();
    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer();
