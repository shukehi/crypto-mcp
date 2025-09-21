# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development**: `npm run dev` - Runs with ts-node for development (HTTP mode by default)
- **Build**: `npm run build` - Compiles TypeScript to JavaScript in `dist/`
- **Start**: `npm start` - Runs the compiled JavaScript version
- **Type checking**: `npx tsc --noEmit` - Check types without building

### Transport Modes

- **HTTP mode**: `npm run dev` or `TRANSPORT=http npm run dev` - Creates HTTP server for JSON-RPC
- **Stdio mode**: `TRANSPORT=stdio npm run dev` - Uses stdin/stdout for MCP communication
- **Production stdio**: `TRANSPORT=stdio node dist/index.js` - Compiled version with stdio transport

### Testing Tools Locally

```bash
# HTTP mode - test via curl
curl -X POST http://localhost:8080/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Check available tools
curl http://localhost:8080/tools

# Health check
curl http://localhost:8080/healthz
```

## Project Architecture

This is an MCP (Model Context Protocol) server that provides Binance cryptocurrency market data tools. The architecture follows a modular design with clear separation of concerns:

### Core Components

- **`src/index.ts`**: Entry point that handles both HTTP and stdio transport modes. Sets up JSON-RPC server or stdin/stdout communication.
- **`src/mcp/server.ts`**: Core MCP server implementation with JSON-RPC handling and tool registration. Contains the `handleRpc` function and `toolsList`.
- **`src/tools/`**: Individual tool implementations that wrap providers with validation, rate limiting, and error handling:
  - `getOhlcv.ts`: OHLCV/candlestick data for spot and futures
  - `getMarkPrice.ts`: Current mark price for futures contracts
  - `getFundingRate.ts`: Historical funding rates for futures
  - `getOpenInterest.ts`: Open interest data for futures
- **`src/providers/`**: Exchange-specific API clients using CCXT:
  - `binanceSpot.ts`: Binance spot market API wrapper
  - `binanceFutures.ts`: Binance futures market API wrapper
- **`src/core/`**: Shared utilities for reliability and performance:
  - `logger.ts`: Pino-based structured logging (stderr for stdio mode)
  - `limiter.ts`: Token bucket rate limiter (10 tokens, 10/sec refill)
  - `retry.ts`: Exponential backoff retry logic with jitter
  - `cache.ts`: Simple in-memory caching (if implemented)

### Available MCP Tools

1. **`get_ohlcv`**: Fetch OHLCV (candlestick) data from Binance spot or futures markets
2. **`get_mark_price`**: Get current mark price for futures contracts
3. **`get_funding_rate`**: Retrieve funding rate history for futures
4. **`get_open_interest`**: Get open interest data for futures contracts

### Key Architecture Patterns

1. **Transport Flexibility**: Supports both HTTP JSON-RPC and stdio transports via `TRANSPORT` env var
   - HTTP mode: Traditional REST-like server for web/API access
   - Stdio mode: Direct stdin/stdout for MCP client integration (Claude Desktop, etc.)
2. **Rate Limiting**: Built-in token bucket rate limiting (10 requests/10 seconds) to respect Binance API limits
3. **Retry Logic**: Automatic retry with exponential backoff (3 retries, 300ms base) and jitter for failed requests
4. **Schema Validation**: Uses Zod for strict input validation on all tools (though currently using default values)
5. **Structured Logging**: Uses Pino logger for consistent JSON logging (routes to stderr in stdio mode)
6. **Error Handling**: Consistent JSON-RPC error responses with proper error codes (-32700, -32601, -32000)
7. **CCXT Integration**: Uses CCXT library for unified exchange API access with built-in rate limiting

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

## Development Workflow

### Adding New Tools

1. Create tool implementation in `src/tools/` (follow existing patterns with rate limiting and retry logic)
2. Add tool definition to `toolsList()` in `src/mcp/server.ts`
3. Add tool call handler in `handleRpc()` function
4. Test with curl commands or stdio mode

### Common Development Tasks

- **Adding new providers**: Create new files in `src/providers/` following CCXT patterns
- **Modifying rate limits**: Adjust values in `RateLimiter` constructor calls
- **Changing retry behavior**: Modify retry options in tool implementations
- **Adding caching**: Implement caching logic in `src/core/cache.ts`

### Debugging

- Set `LOG_LEVEL=debug` to see detailed request/response logs
- Use `console.log` in stdio mode (outputs to stderr due to transport separation)
- HTTP mode allows standard debugging tools and curl testing
- Check CCXT enableRateLimit in providers if hitting API limits

### Code Patterns

- All tools follow the pattern: validate input → rate limit → retry with provider call → format response
- Providers are thin wrappers around CCXT with symbol normalization
- Error handling uses JSON-RPC standard error codes consistently
- Logging includes structured data for better observability