// src/index.ts
import dotenv from "dotenv";
dotenv.config();

import { connectDatabase } from './config/database';
import { MessageQueue } from './messageQueue';
import { WinnerService } from './services/winnerService';
import { EventHandlers } from './services/eventHandlers';
import { Scheduler } from './scheduler';
import { Server } from './server';

async function main() {
  try {
    console.log('🚀 Starting Winner Service...');

    // Connect to database
    await connectDatabase();

    // Initialize message queue
    const messageQueue = new MessageQueue();
    await messageQueue.connect();

    // Initialize services
    const winnerService = new WinnerService(messageQueue);
    const eventHandlers = new EventHandlers(winnerService);
    const scheduler = new Scheduler(winnerService);
    const server = new Server(winnerService, scheduler);

    // Setup message queue consumers
    await messageQueue.setupConsumers(
      eventHandlers.handleCompetitionCreated.bind(eventHandlers),
      eventHandlers.handleSubmissionCreated.bind(eventHandlers),
      eventHandlers.handleSubmissionDeleted.bind(eventHandlers),
      eventHandlers.handleCompetitionDeleted.bind(eventHandlers),
      eventHandlers.handleComparisonCompleted.bind(eventHandlers),
      eventHandlers.handleCompetitionStopped.bind(eventHandlers)
    );

    // Start scheduler
    scheduler.start();

    // Start HTTP server
    server.start();

    console.log('✅ Winner Service started successfully');
    console.log('📋 Service capabilities:');
    console.log('   • Tracks competitions and submissions via message queue');
    console.log('   • Automatically selects winners when competitions end');
    console.log('   • Uses highest score with submission time as tiebreaker');
    console.log('   • Publishes winner.selected events');
    console.log('   • Provides health checks and statistics');
    console.log('   • Runs periodic checks every minute');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      
      scheduler.stop();
      await messageQueue.close();
      
      console.log('✅ Winner Service stopped successfully');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      
      scheduler.stop();
      await messageQueue.close();
      
      console.log('✅ Winner Service stopped successfully');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start Winner Service:', error);
    process.exit(1);
  }
}

// Start the service
main().catch((error) => {
  console.error('❌ Unhandled error in main:', error);
  process.exit(1);
});
