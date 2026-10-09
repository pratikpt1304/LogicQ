import { IQueueService } from './queue.interface.js';
import { InMemoryQueue } from './memory.queue.js';
import { BullMQQueue } from './bullmq.queue.js';
import { ENV } from '../config/env.js';

let activeQueue: IQueueService | null = null;

export function getQueue(): IQueueService {
  if (activeQueue) return activeQueue;

  if (ENV.REDIS_URL) {
    try {
      console.log('⚡ Initializing BullMQ with Redis:', ENV.REDIS_URL);
      activeQueue = new BullMQQueue();
      return activeQueue;
    } catch (e) {
      console.warn('⚠️ Failed to connect to Redis. Falling back to InMemoryQueue.', e);
    }
  }

  console.log('⚡ Using InMemoryQueue for submissions');
  activeQueue = new InMemoryQueue();
  return activeQueue;
}
