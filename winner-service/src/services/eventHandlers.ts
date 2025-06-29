// src/services/eventHandlers.ts
import { Competition } from '../models/Competition';
import { Submission } from '../models/Submission';
import { ComparisonResult } from '../models/ComparisonResult';
import { 
  CompetitionCreatedEvent, 
  SubmissionCreatedEvent, 
  SubmissionDeletedEvent,
  CompetitionDeletedEvent,
  ComparisonCompletedEvent,
  CompetitionStoppedEvent
} from '../messageQueue';
import { WinnerService } from './winnerService';

export class EventHandlers {
  private winnerService: WinnerService;

  constructor(winnerService: WinnerService) {
    this.winnerService = winnerService;
  }

  /**
   * Handle competition.created events
   * Store competition data for winner tracking
   */
  async handleCompetitionCreated(event: CompetitionCreatedEvent): Promise<void> {
    try {
      const { competition } = event;
      
      // Check if competition already exists
      const existingCompetition = await Competition.findById(competition._id);
      if (existingCompetition) {
        console.log(`Competition ${competition._id} already exists, skipping`);
        return;
      }      // Create new competition record
      const newCompetition = new Competition({
        _id: competition._id,
        title: competition.title,
        description: competition.description,
        targetImage: competition.targetImage,
        location: competition.location,
        startDate: competition.startDate ? new Date(competition.startDate) : undefined,
        endDate: competition.endDate ? new Date(competition.endDate) : undefined,
        status: competition.status,
        owner: competition.owner,
        isWinnerSelected: false,
        winnerSubmissionId: null
      });

      await newCompetition.save();
      
      console.log(`📝 Stored competition: ${competition.title} (ID: ${competition._id})`);
      if (competition.endDate) {
        console.log(`   End date: ${new Date(competition.endDate).toISOString()}`);
      } else {
        console.log(`   No end date - runs indefinitely until stopped`);
      }} catch (error) {
      console.error('Error handling competition.created event:', error);
    }
  }

  /**
   * Handle submission.created events
   * Store submission data for winner tracking
   */
  async handleSubmissionCreated(event: SubmissionCreatedEvent): Promise<void> {
    try {
      const { submission } = event;
      
      // Check if submission already exists
      const existingSubmission = await Submission.findById(submission._id);
      if (existingSubmission) {
        console.log(`Submission ${submission._id} already exists, skipping`);
        return;
      }

      // Create new submission record
      const newSubmission = new Submission({
        _id: submission._id,
        competitionId: submission.competitionId,
        owner: submission.owner,
        submissionData: submission.submissionData,
        createdAt: new Date(submission.createdAt),
        updatedAt: new Date(submission.updatedAt)
      });

      await newSubmission.save();
      
      console.log(`📝 Stored submission: ${submission._id} for competition: ${submission.competitionId}`);

    } catch (error) {
      console.error('Error handling submission.created event:', error);
    }
  }

  /**
   * Handle comparison.completed events
   * Store comparison results and check if competition can have winner selected
   */
  async handleComparisonCompleted(event: ComparisonCompletedEvent): Promise<void> {
    try {
      const { comparisonResult } = event;
      
      // Check if comparison result already exists
      const existingResult = await ComparisonResult.findOne({ 
        submissionId: comparisonResult.submissionId 
      });
      if (existingResult) {
        // Update existing result
        existingResult.score = comparisonResult.score;
        existingResult.status = comparisonResult.status;
        existingResult.errorMessage = comparisonResult.errorMessage;
        await existingResult.save();
        console.log(`📝 Updated comparison result for submission: ${comparisonResult.submissionId}`);
      } else {
        // Create new comparison result
        const newResult = new ComparisonResult({
          submissionId: comparisonResult.submissionId,
          competitionId: comparisonResult.competitionId,
          score: comparisonResult.score,
          status: comparisonResult.status,
          errorMessage: comparisonResult.errorMessage
        });
        await newResult.save();
        console.log(`📝 Stored comparison result for submission: ${comparisonResult.submissionId}, score: ${comparisonResult.score}`);
      }

      // Check if the competition has ended and if so, try to select winner
      const competition = await Competition.findById(comparisonResult.competitionId);
      if (competition && !competition.isWinnerSelected) {
        const now = new Date();
        if (competition.endDate && competition.endDate <= now) {
          console.log(`⏰ Competition ${comparisonResult.competitionId} has ended, checking for winner selection`);
          await this.winnerService.selectWinnerForCompetition(comparisonResult.competitionId);
        }
      }

    } catch (error) {
      console.error('Error handling comparison.completed event:', error);
    }
  }

  /**
   * Handle competition.stopped events
   * Update competition status and trigger winner selection
   */
  async handleCompetitionStopped(event: CompetitionStoppedEvent): Promise<void> {
    try {
      const { competitionId, stoppedAt } = event;
      
      console.log(`🛑 Processing competition stopped event for: ${competitionId}`);

      // Find and update the competition
      const competition = await Competition.findById(competitionId);
      if (!competition) {
        console.log(`Competition ${competitionId} not found in winner service`);
        return;
      }

      // Update competition status
      competition.status = 'stopped';
      competition.stoppedAt = new Date(stoppedAt);
      await competition.save();

      // Trigger winner selection for the stopped competition
      await this.winnerService.selectWinnerForCompetition(competitionId);

      console.log(`✅ Updated competition ${competitionId} status to stopped and triggered winner selection`);

    } catch (error) {
      console.error('Error handling competition.stopped event:', error);
    }
  }

  /**
   * Handle competition.deleted events
   * Clean up competition data
   */
  async handleCompetitionDeleted(event: CompetitionDeletedEvent): Promise<void> {
    try {
      const { competitionId } = event;
      
      console.log(`🗑️ Processing competition deleted event for: ${competitionId}`);

      // Delete all related data
      await Competition.findByIdAndDelete(competitionId);
      await Submission.deleteMany({ competitionId });
      await ComparisonResult.deleteMany({ competitionId });

      console.log(`✅ Cleaned up all data for deleted competition: ${competitionId}`);

    } catch (error) {
      console.error('Error handling competition.deleted event:', error);
    }
  }

  /**
   * Handle submission.deleted events
   * Clean up submission data
   */
  async handleSubmissionDeleted(event: SubmissionDeletedEvent): Promise<void> {
    try {
      const { submission } = event;
      
      console.log(`🗑️ Processing submission deleted event for: ${submission._id}`);

      // Delete the submission and related comparison results
      await Submission.findByIdAndDelete(submission._id);
      await ComparisonResult.deleteMany({ submissionId: submission._id });

      console.log(`✅ Cleaned up data for deleted submission: ${submission._id}`);

    } catch (error) {
      console.error('Error handling submission.deleted event:', error);
    }
  }
}
