// src/server.ts
import express from 'express';
import { WinnerService } from './services/winnerService';
import { Scheduler } from './scheduler';

export class Server {
  private app: express.Application;
  private winnerService: WinnerService;
  private scheduler: Scheduler;
  private port: number;

  constructor(winnerService: WinnerService, scheduler: Scheduler) {
    this.app = express();
    this.winnerService = winnerService;
    this.scheduler = scheduler;
    this.port = parseInt(process.env.PORT || '3005');
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        service: 'winner-service',
        timestamp: new Date().toISOString()
      });
    });

    // Winner statistics endpoint
    this.app.get('/stats', async (req, res) => {
      try {
        const stats = await this.winnerService.getWinnerStats();
        res.status(200).json({
          ...stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
      }
    });

    // Manual trigger endpoint for winner selection
    this.app.post('/trigger-winner-selection', async (req, res) => {
      try {
        await this.scheduler.runNow();
        res.status(200).json({
          message: 'Winner selection triggered successfully',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error triggering winner selection:', error);
        res.status(500).json({ error: 'Failed to trigger winner selection' });
      }
    });

    // Fallback route
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 Winner service HTTP server running on port ${this.port}`);
    });
  }
}
