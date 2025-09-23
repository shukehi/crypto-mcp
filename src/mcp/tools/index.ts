import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerBinanceKlinesTool,
  registerFetchTool,
  registerRollDiceTool,
  registerSearchTool,
} from './registerBinanceKlinesTool';
import { registerFuturesKlinesTool } from './registerFuturesKlinesTool';

export function registerTools(server: McpServer) {
  registerRollDiceTool(server);
  registerBinanceKlinesTool(server);
  registerFuturesKlinesTool(server);
  registerSearchTool(server);
  registerFetchTool(server);
}
