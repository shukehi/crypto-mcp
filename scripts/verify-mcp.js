#!/usr/bin/env node
/*
 * Smoke test for the MCP server. It builds the project, starts `next start` on a temporary port,
 * validates that the four baseline tools exist, and executes the `search -> fetch -> get_binance_klines`
 * flow. Any failure exits with a non-zero code for CI visibility.
 */

const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

const REQUIRED_TOOLS = ['search', 'fetch', 'get_binance_klines', 'get_binance_perp_klines', 'roll_dice'];
const PORT = process.env.MCP_VERIFY_PORT || '4311';
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      ...options,
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
    child.on('error', reject);
  });
}

async function waitForServer(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 'ping', method: 'tools/list', params: {} }),
      });
      if (res.ok) {
        return;
      }
    } catch (error) {
      // ignore until timeout
    }
    await delay(250);
  }
  throw new Error(`Server did not become ready at ${url}`);
}

function parseSseJson(raw) {
  const lines = raw.split('\n');
  const dataLine = lines.find((line) => line.startsWith('data: '));
  if (!dataLine) {
    throw new Error(`Unable to parse SSE payload: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(dataLine.slice(6));
}

async function callMcp(method, params) {
  const response = await fetch(`${BASE_URL}/api/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: `${method}-${Date.now()}`, method, params }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`MCP call failed (${method}): ${response.status} ${text}`);
  }
  return parseSseJson(text);
}

async function main() {
  await runCommand('pnpm', ['exec', 'next', 'build']);

  const server = spawn('pnpm', ['exec', 'next', 'start', '--hostname', '127.0.0.1', '--port', PORT], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT,
    },
  });

  const cleanup = () => {
    if (!server.killed) {
      server.kill('SIGTERM');
    }
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(1);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(1);
  });

  try {
    await waitForServer(`${BASE_URL}/api/mcp`);

    const toolsResponse = await callMcp('tools/list', {});
    const tools = (toolsResponse.result && toolsResponse.result.tools) || [];
    const toolNames = tools.map((tool) => tool.name);

    for (const tool of REQUIRED_TOOLS) {
      if (!toolNames.includes(tool)) {
        throw new Error(`Missing required tool: ${tool}`);
      }
    }

    const searchResponse = await callMcp('tools/call', {
      name: 'search',
      arguments: { query: 'BTCUSDT 1h' },
    });
    const searchResults =
      searchResponse.result?.structuredContent?.results || [];
    if (searchResults.length === 0) {
      throw new Error('Search tool returned no results');
    }
    const targetId = searchResults[0].id;

    const fetchResponse = await callMcp('tools/call', {
      name: 'fetch',
      arguments: { id: targetId },
    });
    if (fetchResponse.result?.isError) {
      throw new Error(`Fetch tool reported error: ${JSON.stringify(fetchResponse.result)}`);
    }

    const klinesResponse = await callMcp('tools/call', {
      name: 'get_binance_klines',
      arguments: { symbol: 'BTCUSDT', interval: '1h', limit: 5 },
    });
    if (klinesResponse.result?.isError) {
      throw new Error(`get_binance_klines reported error: ${JSON.stringify(klinesResponse.result)}`);
    }
    const futuresResponse = await callMcp('tools/call', {
      name: 'get_binance_perp_klines',
      arguments: { symbol: 'BTCUSDT', interval: '1h', limit: 30 },
    });
    if (futuresResponse.result?.isError) {
      throw new Error(`get_binance_perp_klines reported error: ${JSON.stringify(futuresResponse.result)}`);
    }

    console.log('MCP verification succeeded.');
  } finally {
    cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
