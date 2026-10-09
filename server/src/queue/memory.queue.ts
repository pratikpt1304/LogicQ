import { IQueueService, SubmissionJob, JobProcessor } from './queue.interface.js';

export class InMemoryQueue implements IQueueService {
  readonly name = 'InMemoryQueue';
  private queue: SubmissionJob[] = [];
  private isProcessing: boolean = false;
  private processor: JobProcessor | null = null;
  private activeWorkers: number = 0;
  private maxConcurrency: number = 2;

  async addJob(job: SubmissionJob): Promise<void> {
    this.queue.push(job);
    this.processNext();
  }

  processJobs(handler: JobProcessor): void {
    this.processor = handler;
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (!this.processor) return;
    if (this.activeWorkers >= this.maxConcurrency) return;
    if (this.queue.length === 0) return;

    const job = this.queue.shift();
    if (!job) return;

    this.activeWorkers++;

    // Run asynchronously without blocking
    (async () => {
      try {
        if (this.processor) {
          await this.processor(job);
        }
      } catch (err) {
        console.error(`Error processing job ${job.submissionId}:`, err);
      } finally {
        this.activeWorkers--;
        this.processNext();
      }
    })();

    // Attempt to fill remaining concurrency slots
    if (this.activeWorkers < this.maxConcurrency && this.queue.length > 0) {
      this.processNext();
    }
  }
}
