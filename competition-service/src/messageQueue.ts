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
    startDate: Date;
    endDate: Date;
    owner: string;
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
        await this.channel.assertExchange('winners', 'topic', { durable: true });
        
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

  async publishCompetitionCreated(event: CompetitionCreatedEvent): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    const routingKey = 'competition.created';
    const message = Buffer.from(JSON.stringify(event));

    this.channel.publish('competitions', routingKey, message, {
      persistent: true,
      timestamp: Date.now(),
    });

    console.log(`Published competition.created event for ID: ${event.competition._id}`);
  }

  async setupWinnerConsumer(onWinnerSelected: (event: WinnerSelectedEvent) => Promise<void>): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    const winnerQueue = 'competition-service-winners';
    
    await this.channel.assertQueue(winnerQueue, { durable: true });
    await this.channel.bindQueue(winnerQueue, 'winners', 'winner.selected');

    this.channel.consume(winnerQueue, async (msg) => {
      if (msg) {
        try {
          const event: WinnerSelectedEvent = JSON.parse(msg.content.toString());
          await onWinnerSelected(event);
          this.channel!.ack(msg);
        } catch (error) {
          console.error('Error processing winner.selected event:', error);
          this.channel!.nack(msg, false, false); // Don't requeue
        }
      }
    });

    console.log('🎧 Winner event consumer set up successfully');
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
