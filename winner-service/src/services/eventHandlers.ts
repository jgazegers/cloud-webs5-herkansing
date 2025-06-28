// src/services/eventHandlers.ts
import { Competition } from '../models/Competition';
import { Submission } from '../models/Submission';
import { ComparisonResult } from '../models/ComparisonResult';
import { 
  CompetitionCreatedEvent, 
  SubmissionCreatedEvent, 
  ComparisonCompletedEvent 
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
      }

      // Create new competition record
      const newCompetition = new Competition({
        _id: competition._id,
        title: competition.title,
        description: competition.description,
        targetImage: competition.targetImage,
        location: competition.location,
        startDate: new Date(competition.startDate),
        endDate: new Date(competition.endDate),
        owner: competition.owner,
        isWinnerSelected: false,
        winnerSubmissionId: null
      });

      await newCompetition.save();
      
      console.log(`📝 Stored competition: ${competition.title} (ID: ${competition._id})`);
      console.log(`   End date: ${new Date(competition.endDate).toISOString()}`);

    } catch (error) {
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
        if (competition.endDate <= now) {
          console.log(`⏰ Competition ${comparisonResult.competitionId} has ended, checking for winner selection`);
          await this.winnerService.selectWinnerForCompetition(comparisonResult.competitionId);
        }
      }

    } catch (error) {
      console.error('Error handling comparison.completed event:', error);
    }
  }
}
