import { MessageQueue, CompetitionCreatedEvent, SubmissionCreatedEvent } from "../messageQueue";
import { ValidCompetition } from "../models";

export class EventService {
  private messageQueue: MessageQueue;

  constructor() {
    this.messageQueue = new MessageQueue();
  }

  async initialize(): Promise<void> {
    try {
      await this.messageQueue.connect();
      await this.messageQueue.subscribeToCompetitionEvents(this.handleCompetitionCreated);
    } catch (error) {
      console.error("Failed to connect to RabbitMQ during startup:", error);
      console.log("🚨 Service will continue without messaging. Competition validation will rely on existing cache only.");
    }
  }

  // Function to handle competition created events
  private async handleCompetitionCreated(event: CompetitionCreatedEvent): Promise<void> {
    try {
      // Cherry-pick only the data we need for validation
      const validCompetition = new ValidCompetition({
        competitionId: event.competition._id,
        title: event.competition.title,
        owner: event.competition.owner,
        targetImage: event.competition.targetImage,
        createdAt: event.competition.createdAt,
      });
      
      await validCompetition.save();
      console.log(`Stored valid competition ID: ${event.competition._id}`);
    } catch (error: any) {
      if (error.code === 11000) {
        // Duplicate key error - competition already exists
        console.log(`Competition ${event.competition._id} already exists in cache`);
      } else {
        console.error('Error storing competition:', error);
        throw error;
      }
    }
  }

  async publishSubmissionCreated(event: SubmissionCreatedEvent): Promise<void> {
    try {
      await this.messageQueue.publishSubmissionCreated(event);
    } catch (error) {
      console.error('Failed to publish submission created event:', error);
      // Don't throw - we don't want submission creation to fail if messaging fails
    }
  }

  async close(): Promise<void> {
    await this.messageQueue.close();
  }
}
