import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { createConfirmation, getConfirmation, listConfirmations } from '@/src/mcp/state/confirmations';
import { toIsoString } from '@/src/mcp/utils';

const RequestSchema = z.object({
  draft: z.record(z.any()),
  reason: z.string().trim().min(1).optional(),
  ttlSeconds: z.number().int().min(30).max(86400).optional(),
});

const FetchSchema = z.object({
  confirmationId: z.string().min(6),
});

export function registerConfirmationTool(server: McpServer) {
  server.tool(
    'request_confirmation',
    'Create a confirmation ticket for a risky action.',
    RequestSchema.shape,
    async (args) => {
      const parsed = RequestSchema.parse(args);
      const record = createConfirmation({
        draft: parsed.draft,
        reason: parsed.reason,
        ttlSeconds: parsed.ttlSeconds,
      });
      const textLines = [
        `Confirmation ID: ${record.id}`,
        `Expires at: ${toIsoString(record.expiresAt)}`,
        `Reason: ${parsed.reason ?? 'N/A'}`,
        'Draft snapshot stored. Awaiting approval.',
      ];
      return {
        content: [{ type: 'text', text: textLines.join('\n') }],
        structuredContent: {
          confirmation: {
            id: record.id,
            createdAt: toIsoString(record.createdAt),
            expiresAt: toIsoString(record.expiresAt),
            reason: record.reason,
            draft: record.draft,
          },
        },
      };
    },
  );

  server.tool(
    'get_confirmation',
    'Retrieve a confirmation ticket by ID.',
    FetchSchema.shape,
    async (args) => {
      const { confirmationId } = FetchSchema.parse(args);
      const record = getConfirmation(confirmationId);
      if (!record) {
        return {
          content: [{ type: 'text', text: `未找到 ID 为 ${confirmationId} 的确认单。` }],
          isError: true,
        };
      }
      const text = [
        `Confirmation ID: ${record.id}`,
        `Created at: ${toIsoString(record.createdAt)}`,
        `Expires at: ${toIsoString(record.expiresAt)}`,
        `Reason: ${record.reason ?? 'N/A'}`,
      ].join('\n');
      return {
        content: [{ type: 'text', text }],
        structuredContent: {
          confirmation: {
            id: record.id,
            createdAt: toIsoString(record.createdAt),
            expiresAt: toIsoString(record.expiresAt),
            reason: record.reason,
            draft: record.draft,
          },
        },
      };
    },
  );

  server.tool(
    'list_confirmations',
    'List all pending confirmation tickets.',
    z.object({}).shape,
    async (_) => {
      const records = listConfirmations();
      if (records.length === 0) {
        return {
          content: [{ type: 'text', text: '当前没有待确认的工单。' }],
          structuredContent: { confirmations: [] },
        };
      }
      const text = records
        .map((record) => `${record.id} → expires ${toIsoString(record.expiresAt)} reason: ${record.reason ?? 'N/A'}`)
        .join('\n');
      return {
        content: [{ type: 'text', text }],
        structuredContent: {
          confirmations: records.map((record) => ({
            id: record.id,
            createdAt: toIsoString(record.createdAt),
            expiresAt: toIsoString(record.expiresAt),
            reason: record.reason,
            draft: record.draft,
          })),
        },
      };
    },
  );
}
