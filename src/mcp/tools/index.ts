import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerBinanceKlinesTool,
  registerFetchTool,
  registerRollDiceTool,
  registerSearchTool,
} from './registerBinanceKlinesTool';

export function registerTools(server: McpServer) {
  registerRollDiceTool(server);
  registerBinanceKlinesTool(server);
  registerSearchTool(server);
  registerFetchTool(server);
}
