export interface SubmissionJob {
  submissionId: string;
}

export type JobProcessor = (job: SubmissionJob) => Promise<void>;

export interface IQueueService {
  name: string;
  addJob(job: SubmissionJob): Promise<void>;
  processJobs(handler: JobProcessor): void;
}
