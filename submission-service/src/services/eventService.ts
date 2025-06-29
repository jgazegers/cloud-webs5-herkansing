import { MessageQueue, CompetitionCreatedEvent, SubmissionCreatedEvent, SubmissionDeletedEvent, CompetitionDeletedEvent, ComparisonCompletedEvent, CompetitionStoppedEvent, WinnerSelectedEvent } from "../messageQueue";
import { ValidCompetition } from "../models";
import { ComparisonEventHandler } from "./comparisonEventHandler";

export class EventService {
  private messageQueue: MessageQueue;
  private comparisonEventHandler: ComparisonEventHandler;

  constructor() {
    this.messageQueue = new MessageQueue();
    this.comparisonEventHandler = new ComparisonEventHandler();
  }

  async initialize(): Promise<void> {
    try {
      await this.messageQueue.connect();
      await this.messageQueue.subscribeToCompetitionEvents(
        this.handleCompetitionCreated.bind(this),
        this.handleCompetitionStopped.bind(this),
        this.handleCompetitionDeleted.bind(this)
      );
      await this.messageQueue.subscribeToComparisonEvents(this.handleComparisonCompleted);
      await this.messageQueue.subscribeToWinnerEvents(this.handleWinnerSelected.bind(this));
    } catch (error) {
      console.error("Failed to connect to RabbitMQ during startup:", error);
      console.log("🚨 Service will continue without messaging. Competition validation will rely on existing cache only.");
    }
  }

  // Function to handle competition created events
  private async handleCompetitionCreated(event: CompetitionCreatedEvent): Promise<void> {
    try {
      // Store all relevant competition data for validation
      const validCompetition = new ValidCompetition({
        competitionId: event.competition._id,
        title: event.competition.title,
        owner: event.competition.owner,
        targetImage: event.competition.targetImage,
        startDate: event.competition.startDate,
        endDate: event.competition.endDate,
        status: event.competition.status,
        createdAt: event.competition.createdAt,
      });
      
      await validCompetition.save();
      console.log(`Stored valid competition ID: ${event.competition._id} with status: ${event.competition.status}`);
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

  // Function to handle competition stopped events
  private async handleCompetitionStopped(event: CompetitionStoppedEvent): Promise<void> {
    try {
      // Update the competition status in local cache
      const updatedCompetition = await ValidCompetition.findOneAndUpdate(
        { competitionId: event.competitionId },
        { status: 'stopped' },
        { new: true }
      );

      if (updatedCompetition) {
        console.log(`Updated competition ${event.competitionId} status to stopped`);
      } else {
        console.log(`Competition ${event.competitionId} not found in local cache`);
      }
    } catch (error) {
      console.error('Error handling competition stopped event:', error);
    }
  }

  // Function to handle competition deleted events
  private async handleCompetitionDeleted(event: CompetitionDeletedEvent): Promise<void> {
    try {
      // Delete the competition from local cache
      const deletedCompetition = await ValidCompetition.findOneAndDelete(
        { competitionId: event.competitionId }
      );

      if (deletedCompetition) {
        console.log(`Removed competition ${event.competitionId} from local cache (deleted)`);
      } else {
        console.log(`Competition ${event.competitionId} not found in local cache for deletion`);
      }
    } catch (error) {
      console.error('Error handling competition deleted event:', error);
    }
  }

  // Function to handle winner selected events
  private async handleWinnerSelected(event: WinnerSelectedEvent): Promise<void> {
    try {
      // Update the competition status to 'ended' when a winner is selected
      const updatedCompetition = await ValidCompetition.findOneAndUpdate(
        { competitionId: event.competitionId },
        { status: 'ended' },
        { new: true }
      );

      if (updatedCompetition) {
        console.log(`Updated competition ${event.competitionId} status to ended (winner selected)`);
      } else {
        console.log(`Competition ${event.competitionId} not found in local cache for winner update`);
      }
    } catch (error) {
      console.error('Error handling winner selected event:', error);
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

  async publishSubmissionDeleted(event: SubmissionDeletedEvent): Promise<void> {
    try {
      await this.messageQueue.publishSubmissionDeleted(event);
    } catch (error) {
      console.error('Failed to publish submission deleted event:', error);
      // Don't throw - we don't want submission deletion to fail if messaging fails
    }
  }

  // Function to handle comparison completed events
  private handleComparisonCompleted = async (event: ComparisonCompletedEvent): Promise<void> => {
    await this.comparisonEventHandler.handleComparisonCompleted(event);
  }

  async close(): Promise<void> {
    await this.messageQueue.close();
  }
}
