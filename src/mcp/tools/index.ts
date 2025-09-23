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

export function registerTools(server: McpServer) {
  registerRollDiceTool(server);
  registerBinanceKlinesTool(server);
  registerFuturesKlinesTool(server);
  registerSearchTool(server);
  registerFetchTool(server);
  registerPriceActionTool(server);
  registerRiskPolicyTools(server);
  registerDraftOrderTool(server);
}
