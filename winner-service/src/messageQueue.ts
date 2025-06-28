// src/messageQueue.ts
import amqp from 'amqplib';

// Event interfaces matching the existing system
export interface CompetitionCreatedEvent {
  competition: {
    _id: string;
    title: string;
    description: string;
    targetImage: string;
    location: {
      name: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
    };
    startDate: Date;
    endDate: Date;
    owner: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface SubmissionCreatedEvent {
  submission: {
    _id: string;
    competitionId: string;
    owner: string;
    submissionData: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface ComparisonCompletedEvent {
  comparisonResult: {
    _id: string;
    submissionId: string;
    competitionId: string;
    score: number;
    status: 'completed' | 'failed';
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

// New event that this service will publish
export interface WinnerSelectedEvent {
  competitionId: string;
  winnerSubmissionId: string;
  winnerScore: number;
  winnerOwner: string;
  competitionTitle: string;
  submissionDate: Date;
  selectedAt: Date;
}

export class MessageQueue {
  private channelModel: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private maxRetries = 10;
  private retryDelay = 5000; // 5 seconds

  async connect(): Promise<void> {
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:password@rabbitmq:5672';
        console.log(`Attempting to connect to RabbitMQ (attempt ${retries + 1}/${this.maxRetries})...`);
        
        this.channelModel = await amqp.connect(rabbitmqUrl);
        this.channel = await this.channelModel.createChannel();
        
        // Declare exchanges
        await this.channel.assertExchange('competitions', 'topic', { durable: true });
        await this.channel.assertExchange('submissions', 'topic', { durable: true });
        await this.channel.assertExchange('comparisons', 'topic', { durable: true });
        await this.channel.assertExchange('winners', 'topic', { durable: true });
        
        console.log('✅ Connected to RabbitMQ successfully');
        return;
      } catch (error: any) {
        retries++;
        console.error(`❌ Failed to connect to RabbitMQ (attempt ${retries}/${this.maxRetries}):`, error.message);
        
        if (retries >= this.maxRetries) {
          throw new Error(`Failed to connect to RabbitMQ after ${this.maxRetries} attempts`);
        }
        
        console.log(`⏳ Retrying in ${this.retryDelay / 1000} seconds...`);
        await this.sleep(this.retryDelay);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async setupConsumers(
    onCompetitionCreated: (event: CompetitionCreatedEvent) => Promise<void>,
    onSubmissionCreated: (event: SubmissionCreatedEvent) => Promise<void>,
    onComparisonCompleted: (event: ComparisonCompletedEvent) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    // Create queues for this service
    const competitionQueue = 'winner-service-competitions';
    const submissionQueue = 'winner-service-submissions';
    const comparisonQueue = 'winner-service-comparisons';

    await this.channel.assertQueue(competitionQueue, { durable: true });
    await this.channel.assertQueue(submissionQueue, { durable: true });
    await this.channel.assertQueue(comparisonQueue, { durable: true });

    // Bind queues to exchanges
    await this.channel.bindQueue(competitionQueue, 'competitions', 'competition.created');
    await this.channel.bindQueue(submissionQueue, 'submissions', 'submission.created');
    await this.channel.bindQueue(comparisonQueue, 'comparisons', 'comparison.completed');

    // Set up consumers
    this.channel.consume(competitionQueue, async (msg) => {
      if (msg) {
        try {
          const event: CompetitionCreatedEvent = JSON.parse(msg.content.toString());
          await onCompetitionCreated(event);
          this.channel!.ack(msg);
        } catch (error) {
          console.error('Error processing competition.created event:', error);
          this.channel!.nack(msg, false, false); // Don't requeue
        }
      }
    });

    this.channel.consume(submissionQueue, async (msg) => {
      if (msg) {
        try {
          const event: SubmissionCreatedEvent = JSON.parse(msg.content.toString());
          await onSubmissionCreated(event);
          this.channel!.ack(msg);
        } catch (error) {
          console.error('Error processing submission.created event:', error);
          this.channel!.nack(msg, false, false); // Don't requeue
        }
      }
    });

    this.channel.consume(comparisonQueue, async (msg) => {
      if (msg) {
        try {
          const event: ComparisonCompletedEvent = JSON.parse(msg.content.toString());
          await onComparisonCompleted(event);
          this.channel!.ack(msg);
        } catch (error) {
          console.error('Error processing comparison.completed event:', error);
          this.channel!.nack(msg, false, false); // Don't requeue
        }
      }
    });

    console.log('🎧 Message queue consumers set up successfully');
  }

  async publishWinnerSelected(event: WinnerSelectedEvent): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    const routingKey = 'winner.selected';
    const message = Buffer.from(JSON.stringify(event));

    this.channel.publish('winners', routingKey, message, {
      persistent: true,
      timestamp: Date.now(),
    });

    console.log(`📢 Published winner.selected event for competition: ${event.competitionId}, winner: ${event.winnerSubmissionId}`);
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.channelModel) {
      await this.channelModel.close();
    }
  }
}
