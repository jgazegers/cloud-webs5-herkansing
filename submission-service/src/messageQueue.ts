// src/messageQueue.ts
import amqp from 'amqplib';

export interface CompetitionCreatedEvent {
  competition: {
    _id: string;
    title: string;
    description: string;
    targetImage: string; // base64 encoded image
    location: {
      name: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
    };
    startDate?: Date; // Optional
    endDate?: Date; // Optional
    status: 'active' | 'stopped' | 'ended';
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
    submissionData: string; // base64 encoded image
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface CompetitionStoppedEvent {
  competitionId: string;
  title: string;
  owner: string;
  stoppedAt: Date;
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
        
        // Declare the exchange for competition events
        await this.channel.assertExchange('competitions', 'topic', { durable: true });
        // Declare the exchange for submission events
        await this.channel.assertExchange('submissions', 'topic', { durable: true });
        // Declare the exchange for comparison events
        await this.channel.assertExchange('comparisons', 'topic', { durable: true });
        
        console.log('✅ Connected to RabbitMQ successfully');
        return;
      } catch (error) {
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

  async subscribeToCompetitionEvents(
    onCompetitionCreated: (event: CompetitionCreatedEvent) => Promise<void>,
    onCompetitionStopped: (event: CompetitionStoppedEvent) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    // Create a queue for the submission service
    const queueName = 'submission-service-competitions';
    await this.channel.assertQueue(queueName, { durable: true });
    
    // Bind queue to exchange for competition events
    await this.channel.bindQueue(queueName, 'competitions', 'competition.created');
    await this.channel.bindQueue(queueName, 'competitions', 'competition.stopped');

    // Set up consumer
    await this.channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const routingKey = msg.fields.routingKey;
          
          if (routingKey === 'competition.created') {
            const event: CompetitionCreatedEvent = JSON.parse(msg.content.toString());
            await onCompetitionCreated(event);
            console.log(`Processed competition.created event for ID: ${event.competition._id}`);
          } else if (routingKey === 'competition.stopped') {
            const event: CompetitionStoppedEvent = JSON.parse(msg.content.toString());
            await onCompetitionStopped(event);
            console.log(`Processed competition.stopped event for ID: ${event.competitionId}`);
          }
          
          this.channel!.ack(msg);
        } catch (error) {
          console.error('Error processing competition event:', error);
          this.channel!.nack(msg, false, false); // Don't requeue failed messages
        }
      }
    });

    console.log('Subscribed to competition events (created and stopped)');
  }

  async subscribeToWinnerEvents(callback: (event: WinnerSelectedEvent) => Promise<void>): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    // Create a queue for winner events
    const queueName = 'submission-service-winners';
    await this.channel.assertQueue(queueName, { durable: true });
    
    // Bind queue to winners exchange
    await this.channel.bindQueue(queueName, 'winners', 'winner.selected');

    // Set up consumer
    await this.channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const event: WinnerSelectedEvent = JSON.parse(msg.content.toString());
          await callback(event);
          this.channel!.ack(msg);
          console.log(`Processed winner.selected event for competition: ${event.competitionId}`);
        } catch (error) {
          console.error('Error processing winner event:', error);
          this.channel!.nack(msg, false, false); // Don't requeue failed messages
        }
      }
    });

    console.log('Subscribed to winner events');
  }

  async publishSubmissionCreated(event: SubmissionCreatedEvent): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    const routingKey = 'submission.created';
    const message = Buffer.from(JSON.stringify(event));

    this.channel.publish('submissions', routingKey, message, {
      persistent: true,
      timestamp: Date.now(),
    });

    console.log(`Published submission.created event for ID: ${event.submission._id}`);
  }

  async subscribeToComparisonEvents(callback: (event: ComparisonCompletedEvent) => Promise<void>): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    // Create a queue for the submission service to receive comparison events
    const queueName = 'submission-service-comparisons';
    await this.channel.assertQueue(queueName, { durable: true });
    
    // Bind queue to exchange for comparison.completed events
    await this.channel.bindQueue(queueName, 'comparisons', 'comparison.completed');

    // Set up consumer
    await this.channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const event: ComparisonCompletedEvent = JSON.parse(msg.content.toString());
          await callback(event);
          this.channel!.ack(msg);
          console.log(`✅ Processed comparison.completed event for submission: ${event.comparisonResult.submissionId}`);
        } catch (error) {
          console.error('❌ Error processing comparison message:', error);
          this.channel!.nack(msg, false, false); // Don't requeue failed messages
        }
      }
    });

    console.log('📢 Subscribed to comparison events');
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
