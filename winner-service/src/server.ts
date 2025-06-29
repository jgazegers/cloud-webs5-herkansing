// src/server.ts
import express from 'express';
import { WinnerService } from './services/winnerService';
import { Scheduler } from './scheduler';
import { specs, swaggerUi } from './config/swagger';

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
    
    // Swagger documentation setup
    this.app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
  }

  private setupRoutes(): void {
    /**
     * @swagger
     * tags:
     *   name: Winner Service
     *   description: Internal winner selection and statistics API
     */

    /**
     * @swagger
     * /health:
     *   get:
     *     summary: Health check endpoint
     *     tags: [Winner Service]
     *     responses:
     *       200:
     *         description: Service is healthy
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/HealthCheck'
     */
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        service: 'winner-service',
        timestamp: new Date().toISOString()
      });
    });

    /**
     * @swagger
     * /stats:
     *   get:
     *     summary: Get winner selection statistics
     *     tags: [Winner Service]
     *     responses:
     *       200:
     *         description: Winner statistics
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/WinnerStats'
     *       500:
     *         description: Server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
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

    /**
     * @swagger
     * /trigger-winner-selection:
     *   post:
     *     summary: Manually trigger winner selection for all competitions
     *     tags: [Winner Service]
     *     responses:
     *       200:
     *         description: Winner selection triggered successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/TriggerResponse'
     *       500:
     *         description: Server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
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

    /**
     * @swagger
     * /trigger-winner-selection/{competitionId}:
     *   post:
     *     summary: Manually trigger winner selection for specific competition
     *     tags: [Winner Service]
     *     parameters:
     *       - in: path
     *         name: competitionId
     *         required: true
     *         schema:
     *           type: string
     *         description: Competition ID
     *     responses:
     *       200:
     *         description: Winner selection triggered for specific competition
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/TriggerResponse'
     *       500:
     *         description: Server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    // Manual trigger for specific competition
    this.app.post('/trigger-winner-selection/:competitionId', async (req, res) => {
      try {
        const { competitionId } = req.params;
        await this.winnerService.selectWinnerForCompetition(competitionId);
        res.status(200).json({
          message: `Winner selection triggered for competition ${competitionId}`,
          competitionId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error triggering winner selection for specific competition:', error);
        res.status(500).json({ error: 'Failed to trigger winner selection for competition' });
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
      console.log(`📊 Health check: http://localhost:${this.port}/health`);
      console.log(`📚 API documentation: http://localhost:${this.port}/api-docs`);
      console.log(`📈 Statistics: http://localhost:${this.port}/stats`);
    });
  }
}
