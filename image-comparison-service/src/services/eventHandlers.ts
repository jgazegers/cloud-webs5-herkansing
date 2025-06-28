// src/services/eventHandlers.ts
import { Competition, Submission, ComparisonResult } from '../models';
import { CompetitionCreatedEvent, SubmissionCreatedEvent } from '../messageQueue';

export class EventHandlers {
  
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
      
      // TODO: In the next phase, we'll call the Imagga API here
      // For now, we just log that the comparison would happen
      console.log(`🔄 Image comparison would start here for submission ${event.submission._id}`);
      
    } catch (error) {
      console.error(`❌ Error handling submission created event:`, error);
      throw error;
    }
  }
}
