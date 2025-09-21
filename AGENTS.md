# Repository Guidelines

## Project Structure & Module Organization
- `src/index.ts` boots the MCP server and selects `http` or `stdio` transport.
- `src/mcp/server.ts` handles JSON-RPC routing, auth, and tool discovery.
- `src/tools/` exposes individual Binance tools (e.g. `getOhlcv`, `getFundingRate`); keep one file per tool with clear schemas.
- `src/providers/` wraps CCXT clients for spot vs futures; share them instead of re-instantiating.
- `src/core/` hosts shared utilities (`logger`, `retry`, `limiter`, `cache`). Build artifacts land in `dist/`; `deploy/` carries systemd/nginx examples; keep `.env.example` aligned with new config keys.

## Build, Test, and Development Commands
- `npm install` installs dependencies pinned in `package-lock.json`.
- `npm run dev` starts the TypeScript server via `ts-node` for rapid iteration.
- `npm run build` compiles to `dist/` under the strict `tsconfig` settings.
- `npm start` runs the compiled server; set `PORT`, `HOST`, and `AUTH_TOKEN` to mirror prod.
- For smoke tests: `curl -s -X POST http://localhost:8080/rpc -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'` while `npm run dev` is active.

## Coding Style & Naming Conventions
- TypeScript uses ESM; favor named exports and explicit relative paths.
- Indent with two spaces, prefer single quotes, and keep trailing commas where they clarify diffs.
- Functions and variables use `camelCase`; classes/factories use `PascalCase`; constants that never change use `UPPER_SNAKE_CASE`.
- Validate external inputs with `zod` alongside each tool and log via `logger` with structured objects.

## Testing Guidelines
- No dedicated test runner yet; document manual checks in PRs and include reproducible curl commands.
- When adding tools, supply at least one sample request/response and consider a lightweight `ts-node` verifier under `scripts/`.
- Exercise both transports (`TRANSPORT=http` and `TRANSPORT=stdio`) before shipping; capture relevant `pino` logs as evidence.

## Commit & Pull Request Guidelines
- Follow the existing imperative style (`Fix …`, `Add …`, `Refactor …`) with concise scopes (<70 chars when possible).
- Reference issues or tickets in the body, note env/deploy implications, and attach validation details (commands run, Binance endpoints touched).
- Describe edge cases covered and call out any TODOs so they can be tracked explicitly.

## Security & Configuration Tips
- Do not commit secrets; rely on `.env` (see `.env.example`) and update `MCP_SETUP.md` whenever keys change.
- Enforce `AUTH_TOKEN` before exposing HTTP endpoints and mirror reverse-proxy updates in `deploy/nginx.conf`.
- Keep exchange API keys read-only and rotate them regularly; document any new scopes required.
