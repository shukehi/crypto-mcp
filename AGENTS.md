# Repository Guidelines

## Project Structure & Module Organization
- `app/api/[transport]/route.ts` hosts the MCP handler exported for `/api/mcp`; do not relocate this file.
- Reusable tool registrations live under `src/mcp/tools/`. Each file should export focused helpers (e.g., `registerBinanceKlinesTool`).
- Utility scripts and CI helpers reside in `scripts/`; the MCP smoke test is `scripts/verify-mcp.js`.
- Workflow configurations are stored in `.github/workflows/`. CODEOWNERS enforce reviews on critical directories.

## Build, Test, and Development Commands
- `pnpm dev` — launches Next.js locally for manual testing (`http://localhost:3000`).
- `pnpm build` — runs the production Next.js build; CI requires a clean run.
- `pnpm verify:mcp` — builds, starts `next start` on a temp port, then calls `search → fetch → get_binance_klines → get_binance_perp_klines`. Always run before pushing.

## Coding Style & Naming Conventions
- Use TypeScript with default Next.js configuration; keep imports path-based via the configured `@/` alias.
- MCP tools must be named in `snake_case` (`search`, `fetch`, `get_binance_klines`, `get_binance_perp_klines`, `price_action_summary`, `get_risk_policy`, `set_risk_policy`, `draft_order`, `roll_dice`). New tools must follow the same pattern.
- Always return a plain-text summary in `content`; `structuredContent` is optional but encouraged for machine parsing.

## Testing Guidelines
- No unit-test framework is defined yet. The required smoke test is `pnpm verify:mcp`; it guards against missing tools or API regressions.
- When adding custom tests, place them alongside the feature module and document the command to run them.

## Commit & Pull Request Guidelines
- Follow concise, imperative commit messages (e.g., `Add search/fetch tools and sanitize Binance symbols`).
- Open pull requests from feature branches; describe changes, include relevant commands run (`pnpm verify:mcp`), and link to issues when applicable.
- Ensure PRs pass the GitHub Actions “Verify MCP” workflow before requesting review.

## Security & Configuration Tips
- `disableSse: true` must remain in the MCP handler; re-enabling SSE requires Redis and will break the ChatGPT connector.
- Secrets (e.g., alternative Binance endpoints) should be injected via environment variables and never committed.
