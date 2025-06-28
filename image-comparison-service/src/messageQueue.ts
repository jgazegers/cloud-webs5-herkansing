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

  async subscribeToCompetitionEvents(callback: (event: CompetitionCreatedEvent) => Promise<void>): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    // Create a queue for the image comparison service
    const queueName = 'image-comparison-service-competitions';
    await this.channel.assertQueue(queueName, { durable: true });
    
    // Bind queue to exchange for competition.created events
    await this.channel.bindQueue(queueName, 'competitions', 'competition.created');

    // Set up consumer
    await this.channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const event: CompetitionCreatedEvent = JSON.parse(msg.content.toString());
          await callback(event);
          this.channel!.ack(msg);
          console.log(`✅ Processed competition.created event for ID: ${event.competition._id}`);
        } catch (error) {
          console.error('❌ Error processing competition message:', error);
          this.channel!.nack(msg, false, false); // Don't requeue failed messages
        }
      }
    });

    console.log('📢 Subscribed to competition events');
  }

  async subscribeToSubmissionEvents(callback: (event: SubmissionCreatedEvent) => Promise<void>): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    // Create a queue for the image comparison service
    const queueName = 'image-comparison-service-submissions';
    await this.channel.assertQueue(queueName, { durable: true });
    
    // Bind queue to exchange for submission.created events
    await this.channel.bindQueue(queueName, 'submissions', 'submission.created');

    // Set up consumer
    await this.channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const event: SubmissionCreatedEvent = JSON.parse(msg.content.toString());
          await callback(event);
          this.channel!.ack(msg);
          console.log(`✅ Processed submission.created event for ID: ${event.submission._id}`);
        } catch (error) {
          console.error('❌ Error processing submission message:', error);
          this.channel!.nack(msg, false, false); // Don't requeue failed messages
        }
      }
    });

    console.log('📢 Subscribed to submission events');
  }

  async publishComparisonCompleted(event: ComparisonCompletedEvent): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    try {
      const message = Buffer.from(JSON.stringify(event));
      const routingKey = 'comparison.completed';
      
      await this.channel.publish('comparisons', routingKey, message, {
        persistent: true,
        timestamp: Date.now(),
        messageId: `comparison-${event.comparisonResult._id}-${Date.now()}`
      });

      console.log(`📤 Published comparison.completed event for submission: ${event.comparisonResult.submissionId}`);
    } catch (error) {
      console.error('❌ Error publishing comparison completed event:', error);
      throw error;
    }
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
