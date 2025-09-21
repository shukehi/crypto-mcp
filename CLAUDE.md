# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development**: `npm run dev` - Runs with ts-node for development
- **Build**: `npm run build` - Compiles TypeScript to JavaScript in `dist/`
- **Start**: `npm start` - Runs the compiled JavaScript version
- **Type checking**: `npx tsc --noEmit` - Check types without building

## Project Architecture

This is an MCP (Model Context Protocol) server that provides Binance cryptocurrency market data tools. The architecture follows a modular design with clear separation of concerns:

### Core Components

- **`src/index.ts`**: Entry point that handles both HTTP and stdio transport modes
- **`src/mcp/server.ts`**: Core MCP server implementation with JSON-RPC handling and tool registration
- **`src/tools/`**: Individual tool implementations (getOhlcv, getMarkPrice, getFundingRate, getOpenInterest)
- **`src/providers/`**: Exchange-specific API clients (`binanceSpot.ts`, `binanceFutures.ts`)
- **`src/core/`**: Shared utilities (logger, rate limiter, retry logic, caching)

### Available MCP Tools

1. **`get_ohlcv`**: Fetch OHLCV (candlestick) data from Binance spot or futures markets
2. **`get_mark_price`**: Get current mark price for futures contracts
3. **`get_funding_rate`**: Retrieve funding rate history for futures
4. **`get_open_interest`**: Get open interest data for futures contracts

### Key Architecture Patterns

1. **Transport Flexibility**: Supports both HTTP JSON-RPC and stdio transports via `TRANSPORT` env var
2. **Rate Limiting**: Built-in rate limiting to respect Binance API limits
3. **Retry Logic**: Automatic retry with exponential backoff for failed requests
4. **Schema Validation**: Uses Zod for strict input validation on all tools
5. **Structured Logging**: Uses Pino logger for consistent, structured logging

### Configuration

Environment variables:
- `TRANSPORT`: 'http' (default) or 'stdio'
- `PORT`: HTTP server port (default: 8080)
- `HOST`: HTTP server host (default: '0.0.0.0')
- `AUTH_TOKEN`: Optional Bearer token for HTTP endpoint authentication
- `LOG_LEVEL`: Logging level (default: 'info')

### Dependencies

- `ccxt`: Unified cryptocurrency exchange API library for Binance integration
- `zod`: Schema validation for tool inputs
- `pino`: Fast JSON logger
- `dotenv`: Environment variable management

### HTTP Endpoints

- `GET /healthz`: Health check endpoint
- `GET /tools`: Returns available tools list
- `POST /rpc`: Main JSON-RPC endpoint for MCP communication