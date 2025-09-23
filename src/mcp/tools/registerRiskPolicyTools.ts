import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { getRiskPolicy, setRiskPolicy, type RiskPolicy } from '@/src/mcp/state/riskPolicy';

const RiskPolicyUpdateSchema = z.object({
  perTradeMaxRiskPct: z.number().min(0.1).max(20).optional(),
  maxLeverage: z.number().min(1).max(100).optional(),
  dailyDrawdownStopPct: z.number().min(0.5).max(50).optional(),
  allowlist: z.array(z.string().min(1)).optional(),
});

export function registerRiskPolicyTools(server: McpServer) {
  server.tool(
    'get_risk_policy',
    'Return the current in-memory risk policy snapshot.',
    {},
    async () => {
      const policy = getRiskPolicy();
      const text = [
        `Per-trade max risk %: ${policy.perTradeMaxRiskPct}`,
        `Max leverage: ${policy.maxLeverage}`,
        `Daily drawdown stop %: ${policy.dailyDrawdownStopPct}`,
        `Allowlist: ${policy.allowlist.length ? policy.allowlist.join(', ') : 'All symbols allowed'}`,
      ].join('\n');

      return {
        content: [{ type: 'text', text }],
        structuredContent: { policy },
      };
    },
  );

  server.tool(
    'set_risk_policy',
    'Update the in-memory risk policy (partial updates allowed).',
    RiskPolicyUpdateSchema.shape,
    async (args) => {
      const update = RiskPolicyUpdateSchema.parse(args);
      try {
        const policy: RiskPolicy = setRiskPolicy(update);
        const text = [
          'Risk policy updated successfully.',
          `Per-trade max risk %: ${policy.perTradeMaxRiskPct}`,
          `Max leverage: ${policy.maxLeverage}`,
          `Daily drawdown stop %: ${policy.dailyDrawdownStopPct}`,
          `Allowlist: ${policy.allowlist.length ? policy.allowlist.join(', ') : 'All symbols allowed'}`,
        ].join('\n');

        return {
          content: [{ type: 'text', text }],
          structuredContent: { policy },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown risk policy error';
        return {
          content: [{ type: 'text', text: `更新风险策略失败: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
