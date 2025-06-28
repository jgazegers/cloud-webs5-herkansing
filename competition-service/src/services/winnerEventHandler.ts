// src/services/winnerEventHandler.ts
import { Competition } from '../models/Competition';
import { WinnerSelectedEvent } from '../messageQueue';

export class WinnerEventHandler {
  
  /**
   * Handle winner.selected events from the winner service
   * Updates the competition with winner information
   */
  async handleWinnerSelected(event: WinnerSelectedEvent): Promise<void> {
    try {
      const { 
        competitionId, 
        winnerSubmissionId, 
        winnerScore, 
        winnerOwner, 
        selectedAt 
      } = event;

      // Update the competition with winner information
      const updatedCompetition = await Competition.findByIdAndUpdate(
        competitionId,
        {
          winnerSubmissionId,
          winnerScore,
          winnerOwner,
          winnerSelectedAt: new Date(selectedAt)
        },
        { new: true }
      );

      if (!updatedCompetition) {
        console.error(`❌ Competition ${competitionId} not found when updating winner`);
        return;
      }

      console.log(`🏆 Updated competition "${updatedCompetition.title}" with winner:
        - Competition ID: ${competitionId}
        - Winner Submission: ${winnerSubmissionId}
        - Winner Owner: ${winnerOwner}
        - Score: ${winnerScore}
        - Selected At: ${selectedAt}`);

    } catch (error) {
      console.error('Error handling winner.selected event:', error);
    }
  }
}
