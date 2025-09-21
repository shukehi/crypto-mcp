import { z } from 'zod';
import { logger } from '../core/logger.js';
import { getOhlcvTool, GetOhlcvArgsSchema } from '../tools/getOhlcv.js';
import { getMarkPriceTool, GetMarkPriceArgsSchema } from '../tools/getMarkPrice.js';
import { getFundingRateTool, GetFundingRateArgsSchema } from '../tools/getFundingRate.js';
import { getOpenInterestTool, GetOpenInterestArgsSchema } from '../tools/getOpenInterest.js';

type JSONValue = any;
type JSONRPC = { jsonrpc: '2.0'; id?: number|string|null; method: string; params?: any };

export async function toolsList() {
  return [
    {
      name: 'get_ohlcv',
      description: 'Fetch OHLCV (K-lines) from Binance spot or futures',
      input_schema: GetOhlcvArgsSchema,
    },
    {
      name: 'get_mark_price',
      description: 'Fetch mark price (futures)',
      input_schema: GetMarkPriceArgsSchema,
    },
    {
      name: 'get_funding_rate',
      description: 'Fetch recent funding rates (futures)',
      input_schema: GetFundingRateArgsSchema,
    },
    {
      name: 'get_open_interest',
      description: 'Fetch open interest (futures)',
      input_schema: GetOpenInterestArgsSchema,
    }
  ];
}

export async function handleRpc(req: JSONRPC): Promise<JSONValue> {
  try {
    if (!req || req.jsonrpc !== '2.0') throw new Error('Invalid JSON-RPC');
    if (req.method === 'tools/list') {
      const result = await toolsList();
      return { jsonrpc: '2.0', id: req.id, result };
    }
    if (req.method === 'tools/call') {
      const { name, arguments: raw } = req.params || {};
      if (!name) throw new Error('Missing tool name');
      switch (name) {
        case 'get_ohlcv': {
          const args = GetOhlcvArgsSchema.parse(raw || {});
          const result = await getOhlcvTool(args);
          return { jsonrpc: '2.0', id: req.id, result: { content: result } };
        }
        case 'get_mark_price': {
          const args = GetMarkPriceArgsSchema.parse(raw || {});
          const result = await getMarkPriceTool(args);
          return { jsonrpc: '2.0', id: req.id, result: { content: result } };
        }
        case 'get_funding_rate': {
          const args = GetFundingRateArgsSchema.parse(raw || {});
          const result = await getFundingRateTool(args);
          return { jsonrpc: '2.0', id: req.id, result: { content: result } };
        }
        case 'get_open_interest': {
          const args = GetOpenInterestArgsSchema.parse(raw || {});
          const result = await getOpenInterestTool(args);
          return { jsonrpc: '2.0', id: req.id, result: { content: result } };
        }
        default:
          return { jsonrpc: '2.0', id: req.id, error: { code: -32601, message: 'Unknown tool' } };
      }
    }
    return { jsonrpc: '2.0', id: req.id, error: { code: -32601, message: 'Unknown method' } };
  } catch (e:any) {
    logger.error({ err: String(e?.message || e) }, 'rpc_error');
    return { jsonrpc: '2.0', id: req.id, error: { code: -32000, message: 'Server error', data: String(e?.message || e) } };
  }
}
