// src/services/comparisonEventHandler.ts
import { ComparisonCompletedEvent } from '../messageQueue';
import { Submission } from '../models';

export class ComparisonEventHandler {
  
  /**
   * Handle comparison completed events
   * This can be used to update submission status, send notifications, etc.
   */
  async handleComparisonCompleted(event: ComparisonCompletedEvent): Promise<void> {
    try {
      console.log(`📥 Processing comparison completed event for submission: ${event.comparisonResult.submissionId}`);
      
      if (event.comparisonResult.status === 'completed') {
        console.log(`✅ Image comparison completed with score: ${event.comparisonResult.score}%`);
        console.log(`🎯 Competition: ${event.comparisonResult.competitionId}`);
        
        // Update the submission with the comparison score
        const updatedSubmission = await Submission.findByIdAndUpdate(
          event.comparisonResult.submissionId,
          {
            similarityScore: event.comparisonResult.score,
            comparisonStatus: 'completed',
            comparisonError: null // Clear any previous errors
          },
          { new: true }
        );

        if (updatedSubmission) {
          console.log(`💾 Updated submission ${event.comparisonResult.submissionId} with score: ${event.comparisonResult.score}%`);
          
          // TODO: Here you can implement additional logic such as:
          // - Send notifications to the user
          // - Update leaderboards
          // - Trigger other workflows based on the score
          // - Check if this is a new high score
          
          if (event.comparisonResult.score >= 90) {
            console.log(`🏆 High similarity score achieved! ${event.comparisonResult.score}%`);
          }
        } else {
          console.warn(`⚠️ Submission ${event.comparisonResult.submissionId} not found for score update`);
        }
        
        console.log(`📊 Submission ${event.comparisonResult.submissionId} scored ${event.comparisonResult.score}% similarity`);
        
      } else if (event.comparisonResult.status === 'failed') {
        console.warn(`⚠️ Image comparison failed for submission: ${event.comparisonResult.submissionId}`);
        console.warn(`❌ Error: ${event.comparisonResult.errorMessage}`);
        
        // Update the submission with the failed status and error message
        const updatedSubmission = await Submission.findByIdAndUpdate(
          event.comparisonResult.submissionId,
          {
            comparisonStatus: 'failed',
            comparisonError: event.comparisonResult.errorMessage,
            similarityScore: null // Clear any previous score
          },
          { new: true }
        );

        if (updatedSubmission) {
          console.log(`💾 Updated submission ${event.comparisonResult.submissionId} with failed status`);
        } else {
          console.warn(`⚠️ Submission ${event.comparisonResult.submissionId} not found for error update`);
        }
        
        // TODO: Handle failed comparisons
        // - Log the error
        // - Notify administrators
        // - Mark submission as needing manual review
        // - Send error notification to user
        
      }
      
    } catch (error) {
      console.error(`❌ Error handling comparison completed event:`, error);
      throw error;
    }
  }
}
