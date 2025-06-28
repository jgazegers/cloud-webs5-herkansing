// src/messageQueue.ts
import amqp from 'amqplib';

export interface CompetitionCreatedEvent {
  competitionId: string;
  title: string;
  owner: string;
  createdAt: Date;
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

    // Create a queue for the submission service
    const queueName = 'submission-service-competitions';
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
          console.log(`Processed competition.created event for ID: ${event.competitionId}`);
        } catch (error) {
          console.error('Error processing message:', error);
          this.channel!.nack(msg, false, false); // Don't requeue failed messages
        }
      }
    });

    console.log('Subscribed to competition events');
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
