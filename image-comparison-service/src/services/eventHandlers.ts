// src/services/eventHandlers.ts
import { Competition, Submission, ComparisonResult } from '../models';
import { CompetitionCreatedEvent, SubmissionCreatedEvent } from '../messageQueue';

export class EventHandlers {
  
  /**
   * Handle competition created events by storing competition data locally
   */
  async handleCompetitionCreated(event: CompetitionCreatedEvent): Promise<void> {
    try {
      console.log(`📥 Processing competition created event for: ${event.competition.title}`);
      
      // Store competition data locally for future reference
      const competition = new Competition({
        _id: event.competition._id,
        title: event.competition.title,
        description: event.competition.description,
        targetImage: event.competition.targetImage,
        location: event.competition.location,
        startDate: event.competition.startDate,
        endDate: event.competition.endDate,
        owner: event.competition.owner,
        createdAt: event.competition.createdAt,
        updatedAt: event.competition.updatedAt
      });

      // Use upsert to avoid duplicates
      await Competition.findOneAndUpdate(
        { _id: event.competition._id },
        competition.toObject(),
        { upsert: true, new: true }
      );

      console.log(`✅ Stored competition: ${event.competition._id} - ${event.competition.title}`);
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
      
      // Store submission data locally
      const submission = new Submission({
        _id: event.submission._id,
        competitionId: event.submission.competitionId,
        owner: event.submission.owner,
        submissionData: event.submission.submissionData,
        createdAt: event.submission.createdAt,
        updatedAt: event.submission.updatedAt
      });

      // Use upsert to avoid duplicates
      await Submission.findOneAndUpdate(
        { _id: event.submission._id },
        submission.toObject(),
        { upsert: true, new: true }
      );

      // Check if we have the competition data
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
      console.log(`🎯 Will compare against competition: ${competition.title}`);
      
      // TODO: In the next phase, we'll call the Imagga API here
      // For now, we just log that the comparison would happen
      console.log(`🔄 Image comparison would start here for submission ${event.submission._id}`);
      
    } catch (error) {
      console.error(`❌ Error handling submission created event:`, error);
      throw error;
    }
  }
}
