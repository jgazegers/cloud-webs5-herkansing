// src/services/eventHandlers.ts
import { Competition, Submission, ComparisonResult } from '../models';
import { CompetitionCreatedEvent, SubmissionCreatedEvent, ComparisonCompletedEvent, MessageQueue } from '../messageQueue';
import { ImaggaService } from './imaggaService';

export class EventHandlers {
  private imaggaService: ImaggaService;
  private messageQueue: MessageQueue;

  constructor(messageQueue: MessageQueue) {
    this.imaggaService = new ImaggaService();
    this.messageQueue = messageQueue;
  }
  
  /**
   * Handle competition created events by storing competition data locally
   */
  async handleCompetitionCreated(event: CompetitionCreatedEvent): Promise<void> {
    try {
      console.log(`📥 Processing competition created event for: ${event.competition._id}`);
      
      // Store only essential data: ID and target image for comparison
      const competition = new Competition({
        _id: event.competition._id,
        targetImage: event.competition.targetImage
      });

      // Use upsert to avoid duplicates
      await Competition.findOneAndUpdate(
        { _id: event.competition._id },
        competition.toObject(),
        { upsert: true, new: true }
      );

      console.log(`✅ Stored competition target image for: ${event.competition._id}`);
    } catch (error) {
      console.error(`❌ Error handling competition created event:`, error);
      throw error;
    }
  }

  /**
   * Handle submission created events by starting image comparison process
   */
  async handleSubmissionCreated(event: SubmissionCreatedEvent): Promise<void> {
    try {
      console.log(`📥 Processing submission created event for submission: ${event.submission._id}`);
      
      // Store only essential data: IDs and submission image for comparison
      const submission = new Submission({
        _id: event.submission._id,
        competitionId: event.submission.competitionId,
        submissionData: event.submission.submissionData
      });

      // Use upsert to avoid duplicates
      await Submission.findOneAndUpdate(
        { _id: event.submission._id },
        submission.toObject(),
        { upsert: true, new: true }
      );

      // Check if we have the competition target image
      const competition = await Competition.findById(event.submission.competitionId);
      if (!competition) {
        console.warn(`⚠️ Competition ${event.submission.competitionId} not found for submission ${event.submission._id}`);
        return;
      }

      // Create a comparison result record
      const comparisonResult = new ComparisonResult({
        submissionId: event.submission._id,
        competitionId: event.submission.competitionId,
        status: 'pending'
      });

      await comparisonResult.save();

      console.log(`✅ Created comparison task for submission: ${event.submission._id}`);
      console.log(`🎯 Will compare against competition: ${competition._id}`);
      
      // Perform the actual image comparison
      await this.performImageComparison(comparisonResult, competition.targetImage, submission.submissionData);
      
    } catch (error) {
      console.error(`❌ Error handling submission created event:`, error);
      throw error;
    }
  }

  /**
   * Perform image comparison using Imagga service
   */
  private async performImageComparison(
    comparisonResult: any,
    targetImage: string,
    submissionImage: string
  ): Promise<void> {
    try {
      console.log(`🔄 Starting image comparison for submission: ${comparisonResult.submissionId}`);
      
      // Check if Imagga service is properly configured
      if (!this.imaggaService.isConfigured()) {
        const errorMsg = 'Imagga API not configured - comparison cannot be performed';
        console.warn(`⚠️ ${errorMsg}`);
        
        await ComparisonResult.findByIdAndUpdate(comparisonResult._id, {
          status: 'failed',
          errorMessage: errorMsg
        });
        
        // Publish comparison failed event
        await this.publishComparisonResult(comparisonResult._id, 'failed');
        return;
      }

      // Validate that both images are provided
      if (!targetImage || !submissionImage) {
        const errorMsg = 'Missing target or submission image data';
        console.error(`❌ ${errorMsg}`);
        
        await ComparisonResult.findByIdAndUpdate(comparisonResult._id, {
          status: 'failed',
          errorMessage: errorMsg
        });
        
        // Publish comparison failed event
        await this.publishComparisonResult(comparisonResult._id, 'failed');
        return;
      }

      console.log(`📷 Comparing images for submission: ${comparisonResult.submissionId}`);
      
      // Call Imagga API to compare the images
      const comparisonResponse = await this.imaggaService.compareImages(targetImage, submissionImage);
      
      console.log(`✅ Image comparison completed - Score: ${comparisonResponse.score}%`);
      
      // Update the comparison result with the score and mark as completed
      await ComparisonResult.findByIdAndUpdate(comparisonResult._id, {
        status: 'completed',
        score: comparisonResponse.score,
        imaggaResponse: comparisonResponse
      });

      console.log(`💾 Saved comparison result for submission: ${comparisonResult.submissionId} with score: ${comparisonResponse.score}%`);
      
      // Publish comparison completed event
      await this.publishComparisonResult(comparisonResult._id, 'completed');
      
    } catch (error) {
      console.error(`❌ Error during image comparison for submission ${comparisonResult.submissionId}:`, error);
      
      // Update the comparison result with error status
      await ComparisonResult.findByIdAndUpdate(comparisonResult._id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error during image comparison'
      });
      
      // Publish comparison failed event
      await this.publishComparisonResult(comparisonResult._id, 'failed');
      
      // Don't re-throw the error to prevent the entire event handler from failing
      // This allows other submissions to continue processing
    }
  }

  /**
   * Publish comparison result event to message queue
   */
  private async publishComparisonResult(comparisonResultId: string, status: 'completed' | 'failed'): Promise<void> {
    try {
      // Fetch the complete comparison result from database
      const comparisonResult = await ComparisonResult.findById(comparisonResultId);
      if (!comparisonResult) {
        console.error(`❌ Comparison result not found: ${comparisonResultId}`);
        return;
      }

      // Create the event payload
      const event: ComparisonCompletedEvent = {
        comparisonResult: {
          _id: comparisonResult._id as string,
          submissionId: comparisonResult.submissionId,
          competitionId: comparisonResult.competitionId,
          score: comparisonResult.score,
          status: comparisonResult.status as 'completed' | 'failed',
          errorMessage: comparisonResult.errorMessage,
          createdAt: comparisonResult.createdAt,
          updatedAt: comparisonResult.updatedAt
        }
      };

      // Publish the event
      await this.messageQueue.publishComparisonCompleted(event);
      
      console.log(`📤 Published comparison ${status} event for submission: ${comparisonResult.submissionId}`);
      
    } catch (error) {
      console.error(`❌ Error publishing comparison result event:`, error);
      // Don't re-throw to avoid breaking the main comparison flow
    }
  }
}
