import { MessageQueue, CompetitionCreatedEvent } from "../messageQueue";
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
      const validCompetition = new ValidCompetition({
        competitionId: event.competitionId,
        title: event.title,
        owner: event.owner,
        createdAt: event.createdAt,
      });
      
      await validCompetition.save();
      console.log(`Stored valid competition ID: ${event.competitionId}`);
    } catch (error: any) {
      if (error.code === 11000) {
        // Duplicate key error - competition already exists
        console.log(`Competition ${event.competitionId} already exists in cache`);
      } else {
        console.error('Error storing competition:', error);
        throw error;
      }
    }
  }

  async close(): Promise<void> {
    await this.messageQueue.close();
  }
}
