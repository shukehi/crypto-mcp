import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerBinanceKlinesTool,
  registerFetchTool,
  registerRollDiceTool,
  registerSearchTool,
} from './registerBinanceKlinesTool';
import { registerFuturesKlinesTool } from './registerFuturesKlinesTool';
import { registerPriceActionTool } from './registerPriceActionTool';
import { registerRiskPolicyTools } from './registerRiskPolicyTools';
import { registerDraftOrderTool } from './registerDraftOrderTool';
import { registerConfirmationTool } from './registerConfirmationTool';
import { registerSchedulerTools } from './registerSchedulerTools';

export function registerTools(server: McpServer) {
  registerRollDiceTool(server);
  registerBinanceKlinesTool(server);
  registerSearchTool(server);
  registerFetchTool(server);

  // Extended tools (disabled in ChatGPT compatible mode)
  if (process.env.CHATGPT_COMPATIBLE_MODE !== 'true') {
    registerFuturesKlinesTool(server);
  }

  // Advanced tools (only when explicitly enabled)
  if (process.env.ENABLE_ADVANCED_TOOLS === 'true') {
    registerPriceActionTool(server);
    registerRiskPolicyTools(server);
    registerDraftOrderTool(server);
    registerConfirmationTool(server);
    registerSchedulerTools(server);
  }
}
