import { customAlphabet } from 'nanoid';
import cron from 'node-cron';

type JobKind = 'analysis' | 'alert';

type AnalysisJobConfig = {
  kind: 'analysis';
  symbol: string;
  interval: string;
  lookback: number;
};

type AlertJobConfig = {
  kind: 'alert';
  symbol: string;
  condition: {
    type: 'crossesAbove' | 'crossesBelow';
    price: number;
  };
};

type BaseJob = {
  id: string;
  cron: string;
  description?: string;
  createdAt: number;
  lastRunAt?: number;
};

export type JobRecord = (BaseJob & AnalysisJobConfig) | (BaseJob & AlertJobConfig);

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);
const jobs = new Map<string, JobRecord>();
const tasks = new Map<string, cron.ScheduledTask>();

const now = () => Date.now();

function scheduleTask(job: JobRecord, callback: (job: JobRecord) => Promise<void>) {
  const task = cron.schedule(job.cron, async () => {
    try {
      await callback(job);
      const record = jobs.get(job.id);
      if (record) {
        record.lastRunAt = now();
        jobs.set(job.id, record);
      }
    } catch (error) {
      console.error(`[scheduler] job ${job.id} failed`, error);
    }
  });
  tasks.set(job.id, task);
}

export function createJob(job: Omit<JobRecord, 'id' | 'createdAt' | 'lastRunAt'>, callback: (job: JobRecord) => Promise<void>): JobRecord {
  const id = nanoid();
  const record: JobRecord = {
    ...job,
    id,
    createdAt: now(),
  } as JobRecord;
  jobs.set(id, record);
  scheduleTask(record, callback);
  return record;
}

export function removeJob(id: string) {
  jobs.delete(id);
  const task = tasks.get(id);
  if (task) {
    task.stop();
    tasks.delete(id);
  }
}

export function listJobs(): JobRecord[] {
  return Array.from(jobs.values());
}

export function getJob(id: string): JobRecord | undefined {
  return jobs.get(id);
}

export function stopAllJobs() {
  for (const task of tasks.values()) {
    task.stop();
  }
  tasks.clear();
  jobs.clear();
}
