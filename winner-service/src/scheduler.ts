// src/scheduler.ts
import * as cron from 'node-cron';
import { WinnerService } from './services/winnerService';

export class Scheduler {
  private winnerService: WinnerService;
  private task: cron.ScheduledTask | null = null;

  constructor(winnerService: WinnerService) {
    this.winnerService = winnerService;
  }

  /**
   * Start the scheduler to check for ended competitions every minute
   */
  start(): void {
    // Run every minute to check for ended competitions
    this.task = cron.schedule('* * * * *', async () => {
      console.log('🕐 Running scheduled check for ended competitions...');
      try {
        await this.winnerService.processEndedCompetitions();
      } catch (error) {
        console.error('Error in scheduled winner selection:', error);
      }
    });

    console.log('⏰ Scheduler started - checking for ended competitions every minute');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('⏹️ Scheduler stopped');
    }
  }

  /**
   * Run winner selection immediately (for testing/manual trigger)
   */
  async runNow(): Promise<void> {
    console.log('🚀 Running manual winner selection check...');
    try {
      await this.winnerService.processEndedCompetitions();
      console.log('✅ Manual winner selection check completed');
    } catch (error) {
      console.error('❌ Error in manual winner selection:', error);
    }
  }
}
