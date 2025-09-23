import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { createJob, listJobs, removeJob, type JobRecord } from '@/src/mcp/state/jobs';
import { sanitizeSymbol } from '@/src/mcp/utils';

const AnalysisSchema = z.object({
  kind: z.literal('analysis'),
  symbol: z.string().min(1),
  interval: z.string().min(1),
  lookback: z.number().int().min(50).max(1000),
});

const AlertSchema = z.object({
  kind: z.literal('alert'),
  symbol: z.string().min(1),
  condition: z.object({
    type: z.enum(['crossesAbove', 'crossesBelow']),
    price: z.number().positive(),
  }),
});

const ScheduleSchema = z.object({
  cron: z.string().min(1),
  description: z.string().trim().optional(),
}).and(AnalysisSchema.or(AlertSchema));

const RemoveSchema = z.object({
  jobId: z.string().min(1),
});

function jobToText(job: JobRecord) {
  const lines = [
    `Job ${job.id} (${job.kind})`,
    `Cron: ${job.cron}`,
    job.description ? `Description: ${job.description}` : undefined,
    `Created at: ${new Date(job.createdAt).toISOString()}`,
    job.lastRunAt ? `Last run: ${new Date(job.lastRunAt).toISOString()}` : undefined,
  ];
  return lines.filter(Boolean).join('\n');
}

export function registerSchedulerTools(server: McpServer) {
  server.tool(
    'schedule_task',
    'Schedule an analysis or alert task (demo; persists in memory only).',
    {},
    async (args) => {
      const parsed = ScheduleSchema.parse(args as unknown as Record<string, unknown>);
      const symbol = sanitizeSymbol(parsed.symbol);
      const job = createJob(
        {
          ...parsed,
          symbol,
        } as JobRecord,
        async () => {
          console.log('[scheduler] task fired', parsed.kind, symbol, parsed.kind === 'analysis' ? parsed.interval : parsed.condition);
        },
      );

      return {
        content: [{ type: 'text', text: `${parsed.kind} job scheduled.\n${jobToText(job)}` }],
        structuredContent: { job },
      };
    },
  );

  server.tool(
    'list_jobs',
    'List in-memory scheduled tasks (analysis/alert).',
    {},
    async (_) => {
      const jobs = listJobs();
      if (jobs.length === 0) {
        return {
          content: [{ type: 'text', text: '当前没有计划任务。' }],
          structuredContent: { jobs: [] },
        };
      }
      const text = jobs.map(jobToText).join('\n\n');
      return {
        content: [{ type: 'text', text }],
        structuredContent: { jobs },
      };
    },
  );

  server.tool(
    'cancel_job',
    'Cancel a scheduled task by ID.',
    {},
    async (args) => {
      const { jobId } = RemoveSchema.parse(args as unknown as Record<string, unknown>);
      removeJob(jobId);
      return {
        content: [{ type: 'text', text: `Job ${jobId} 已取消。` }],
        structuredContent: { jobId },
      };
    },
  );
}
