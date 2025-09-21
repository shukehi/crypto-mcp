import { logger } from '../core/logger.js';
import { getOhlcvTool } from '../tools/getOhlcv.js';
import { getMarkPriceTool } from '../tools/getMarkPrice.js';
import { getFundingRateTool } from '../tools/getFundingRate.js';
import { getOpenInterestTool } from '../tools/getOpenInterest.js';

type JSONValue = any;
type JSONRPC = { jsonrpc: '2.0'; id?: number|string|null; method: string; params?: any };

export async function toolsList() {
  return [
    {
      name: 'get_ohlcv',
      description: 'Fetch OHLCV (K-lines) from Binance spot or futures',
      input_schema: {
        type: 'object',
        properties: {
          market: { type: 'string', enum: ['spot', 'futures'], default: 'futures' },
          symbol: { type: 'string', default: 'SOLUSDT' },
          timeframe: { type: 'string', enum: ['1m', '5m', '15m', '1h', '4h', '1d'], default: '1h' },
          limit: { type: 'number', minimum: 10, maximum: 1500, default: 500 },
          since: { type: 'number', nullable: true }
        },
        required: []
      },
    },
    {
      name: 'get_mark_price',
      description: 'Fetch mark price (futures)',
      input_schema: {
        type: 'object',
        properties: {
          symbol: { type: 'string', default: 'SOLUSDT' }
        },
        required: []
      },
    },
    {
      name: 'get_funding_rate',
      description: 'Fetch recent funding rates (futures)',
      input_schema: {
        type: 'object',
        properties: {
          symbol: { type: 'string', default: 'SOLUSDT' },
          limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 }
        },
        required: []
      },
    },
    {
      name: 'get_open_interest',
      description: 'Fetch open interest (futures)',
      input_schema: {
        type: 'object',
        properties: {
          symbol: { type: 'string', default: 'SOLUSDT' },
          timeframe: { type: 'string', enum: ['5m', '15m', '1h', '4h', '1d'], default: '1h' },
          limit: { type: 'number', minimum: 1, maximum: 1000, default: 200 }
        },
        required: []
      },
    }
  ];
}

export async function handleRpc(req: any): Promise<JSONValue> {
  try {
    // Be more lenient with JSON-RPC validation
    if (!req || typeof req !== 'object') throw new Error('Invalid request');
    if (req.jsonrpc && req.jsonrpc !== '2.0') throw new Error('Invalid JSON-RPC version');

    // MCP Protocol Methods
    if (req.method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id: req.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'crypto-binance',
            version: '0.1.0'
          }
        }
      };
    }

    if (req.method === 'initialized') {
      return { jsonrpc: '2.0', id: req.id, result: {} };
    }

    if (req.method === 'ping') {
      return { jsonrpc: '2.0', id: req.id, result: {} };
    }

    if (req.method === 'tools/list') {
      const result = await toolsList();
      return { jsonrpc: '2.0', id: req.id, result: { tools: result } };
    }
    if (req.method === 'tools/call') {
      const { name, arguments: raw } = req.params || {};
      if (!name) throw new Error('Missing tool name');
      switch (name) {
        case 'get_ohlcv': {
          const args = {
            market: raw?.market || 'futures',
            symbol: raw?.symbol || 'SOLUSDT',
            timeframe: raw?.timeframe || '1h',
            limit: raw?.limit || 500,
            since: raw?.since || null
          };
          const result = await getOhlcvTool(args);
          return { jsonrpc: '2.0', id: req.id, result: { content: result } };
        }
        case 'get_mark_price': {
          const args = {
            symbol: raw?.symbol || 'SOLUSDT'
          };
          const result = await getMarkPriceTool(args);
          return { jsonrpc: '2.0', id: req.id, result: { content: result } };
        }
        case 'get_funding_rate': {
          const args = {
            symbol: raw?.symbol || 'SOLUSDT',
            limit: raw?.limit || 100
          };
          const result = await getFundingRateTool(args);
          return { jsonrpc: '2.0', id: req.id, result: { content: result } };
        }
        case 'get_open_interest': {
          const args = {
            symbol: raw?.symbol || 'SOLUSDT',
            timeframe: raw?.timeframe || '1h',
            limit: raw?.limit || 200
          };
          const result = await getOpenInterestTool(args);
          return { jsonrpc: '2.0', id: req.id, result: { content: result } };
        }
        default:
          return { jsonrpc: '2.0', id: req.id, error: { code: -32601, message: 'Unknown tool' } };
      }
    }
    return { jsonrpc: '2.0', id: req.id || null, error: { code: -32601, message: 'Unknown method' } };
  } catch (e:any) {
    logger.error({ err: String(e?.message || e), req }, 'rpc_error');
    return { jsonrpc: '2.0', id: req?.id || null, error: { code: -32000, message: 'Server error', data: String(e?.message || e) } };
  }
}
