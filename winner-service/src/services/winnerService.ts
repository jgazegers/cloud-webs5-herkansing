// src/services/winnerService.ts
import { Competition } from '../models/Competition';
import { Submission } from '../models/Submission';
import { ComparisonResult } from '../models/ComparisonResult';
import { MessageQueue, WinnerSelectedEvent } from '../messageQueue';

export class WinnerService {
  private messageQueue: MessageQueue;

  constructor(messageQueue: MessageQueue) {
    this.messageQueue = messageQueue;
  }

  /**
   * Check for competitions that have ended and need a winner selected
   */
  async processEndedCompetitions(): Promise<void> {
    try {
      const now = new Date();
      
      // Find competitions that have ended but don't have a winner selected yet
      const endedCompetitions = await Competition.find({
        endDate: { $lt: now },
        isWinnerSelected: false
      });

      console.log(`🔍 Found ${endedCompetitions.length} competitions that need winner selection`);

      for (const competition of endedCompetitions) {
        await this.selectWinnerForCompetition(competition._id);
      }
    } catch (error) {
      console.error('Error processing ended competitions:', error);
    }
  }

  /**
   * Select a winner for a specific competition
   * Winner is chosen based on highest score, with submission time as tiebreaker (earlier wins)
   */
  async selectWinnerForCompetition(competitionId: string): Promise<void> {
    try {
      console.log(`🏆 Selecting winner for competition: ${competitionId}`);

      // Find all completed comparison results for this competition
      const comparisonResults = await ComparisonResult.find({
        competitionId,
        status: 'completed'
      }).sort({
        score: -1,    // Highest score first
        createdAt: 1  // Earlier submission first (tiebreaker)
      });

      if (comparisonResults.length === 0) {
        console.log(`⚠️ No completed comparisons found for competition ${competitionId}`);
        return;
      }

      // Get the winning comparison result (first one after sorting)
      const winningResult = comparisonResults[0];
      
      // Get submission details for the winner
      const winningSubmission = await Submission.findById(winningResult.submissionId);
      if (!winningSubmission) {
        console.error(`❌ Could not find submission ${winningResult.submissionId}`);
        return;
      }

      // Get competition details
      const competition = await Competition.findById(competitionId);
      if (!competition) {
        console.error(`❌ Could not find competition ${competitionId}`);
        return;
      }

      // Update competition with winner
      await Competition.findByIdAndUpdate(competitionId, {
        winnerSubmissionId: winningResult.submissionId,
        isWinnerSelected: true
      });

      // Publish winner selected event
      const winnerEvent: WinnerSelectedEvent = {
        competitionId,
        winnerSubmissionId: winningResult.submissionId,
        winnerScore: winningResult.score,
        winnerOwner: winningSubmission.owner,
        competitionTitle: competition.title,
        submissionDate: winningSubmission.createdAt,
        selectedAt: new Date()
      };

      await this.messageQueue.publishWinnerSelected(winnerEvent);

      console.log(`🎉 Winner selected for competition "${competition.title}":
        - Submission ID: ${winningResult.submissionId}
        - Score: ${winningResult.score}
        - Owner: ${winningSubmission.owner}
        - Submission Date: ${winningSubmission.createdAt.toISOString()}`);

    } catch (error) {
      console.error(`Error selecting winner for competition ${competitionId}:`, error);
    }
  }

  /**
   * Get winner statistics for monitoring
   */
  async getWinnerStats(): Promise<{
    totalCompetitions: number;
    competitionsWithWinners: number;
    competitionsAwaitingWinners: number;
    endedCompetitionsWithoutWinners: number;
  }> {
    try {
      const now = new Date();
      
      const [
        totalCompetitions,
        competitionsWithWinners,
        endedCompetitionsWithoutWinners
      ] = await Promise.all([
        Competition.countDocuments({}),
        Competition.countDocuments({ isWinnerSelected: true }),
        Competition.countDocuments({
          endDate: { $lt: now },
          isWinnerSelected: false
        })
      ]);

      const competitionsAwaitingWinners = await Competition.countDocuments({
        endDate: { $gte: now },
        isWinnerSelected: false
      });

      return {
        totalCompetitions,
        competitionsWithWinners,
        competitionsAwaitingWinners,
        endedCompetitionsWithoutWinners
      };
    } catch (error) {
      console.error('Error getting winner stats:', error);
      return {
        totalCompetitions: 0,
        competitionsWithWinners: 0,
        competitionsAwaitingWinners: 0,
        endedCompetitionsWithoutWinners: 0
      };
    }
  }
}
