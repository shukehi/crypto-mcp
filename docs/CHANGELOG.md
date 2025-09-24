# Changelog

## Unreleased
- Added `ENABLE_ADVANCED_TOOLS` flag. Advanced tools (price action, risk policy, confirmations, scheduler)
  are disabled by default for maximum compatibility with ChatGPT Developer Mode.
- Added `/api/sse` heartbeat endpoint so ChatGPT's SSE probe succeeds even when full SSE transport is disabled.
- Normalized MCP request headers to accept missing `text/event-stream` entries.

## v1.1.0 – Stage 3 (Confirmations & Scheduling)
- Added in-memory confirmation store with `request_confirmation`, `get_confirmation`, `list_confirmations`.
- Introduced scheduler demo (`schedule_task`, `list_jobs`, `cancel_job`) backed by `node-cron`.
- Smoke test now covers confirmation pipeline.

## v1.0.1 – Stage 2 (Analysis Toolkit)
- Implemented `price_action_summary`, `get_risk_policy`, `set_risk_policy`, `draft_order`.
- Extended futures/spot klines reuse shared utils and updated verification script.

## v1.0.0 – Baseline Hardening & Market Data Expansion
- Refactored tool registration, added TypeScript helper modules, ensured ChatGPT compliance.
- Exposed spot & USDⓈ-M klines (`get_binance_klines`, `get_binance_perp_klines`).
- Established `pnpm verify:mcp` smoke test.
