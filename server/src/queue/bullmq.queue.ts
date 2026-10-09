import { Queue, Worker } from 'bullmq';
import { IQueueService, SubmissionJob, JobProcessor } from './queue.interface.js';
import { ENV } from '../config/env.js';
import { Redis } from 'ioredis';

export class BullMQQueue implements IQueueService {
  readonly name = 'BullMQQueue';
  private queue: Queue;
  private connection: Redis;
  private worker: Worker | null = null;

  constructor() {
    this.connection = new Redis(ENV.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
    this.queue = new Queue('logicq_submissions', {
      connection: this.connection,
    });
  }

  async addJob(job: SubmissionJob): Promise<void> {
    await this.queue.add('eval_submission', job, {
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  processJobs(handler: JobProcessor): void {
    if (this.worker) return;
    this.worker = new Worker(
      'logicq_submissions',
      async (bullJob) => {
        await handler(bullJob.data as SubmissionJob);
      },
      {
        connection: this.connection,
        concurrency: 2,
      }
    );
  }
}
