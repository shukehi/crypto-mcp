# Incremental Development Plan

This roadmap builds on baseline tag `v1.0.0` and keeps the ChatGPT connector fully operational. Each stage can ship independently; do not proceed until the acceptance checklist for the current stage is green.

## Stage 0 – Baseline Hardening (0.5 day)
- **Goals**: centralise tool registration, share types/utilities, enforce symbol sanitisation.
- **Tasks**: create `src/mcp/{types,utils}.ts`, refactor existing tools to import helpers, update `registerTools` entry point.
- **Acceptance**: `pnpm verify:mcp` passes; API responses stay backward compatible; code review approved.

## Stage 1 – Market Data Expansion (1 day)
1. **M1:** add `get_binance_perp_klines` (USDⓈ-M futures). Mirror current spot tool, reuse `zod` schemas, return last-5 preview + `candles` array.
2. **M2:** extend smoke test to call the new tool with BTCUSDT_PERP.
- **Acceptance**: curl check returns HTTP 200; CI workflow updated and green.

## Stage 2 – Analysis Toolkit (2 days)
1. **M3:** implement `price_action_summary` using recent candles (supports lookback, interval). Output trend, support/resistance levels, breakout candidates.
2. **M4:** add risk policy helpers `get_risk_policy` / `set_risk_policy` with in-memory storage (JSON persisted later).
3. **M5:** create `draft_order` to compute entry/TP/SL, RR, risk %, and flag `needsConfirm`.
- **Acceptance**: new tools documented in README + demo scripts; `pnpm verify:mcp` updated to exercise `draft_order`; ChatGPT smoke conversation succeeds (record chat transcript).

## Stage 3 – Confirmation & Scheduling (1–1.5 days)
1. **M6:** add `request_confirmation` returning `confirmationId` and caching the draft (no real execution yet).
2. **M7 (optional):** lightweight scheduler/alert prototype (`schedule_analysis`, `create_alert`) using `node-cron` and in-memory state.
- **Acceptance**: manual test checklist attached to PR; log messages confirm flow; README warning that features are non-persistent.

## Stage 4 – Execution Adapter (optional, 2+ days)
- Implement Binance futures private API wrapper (signed requests, clock drift protection, idempotency via `makeIdemKey`).
- Require explicit confirmation before `place_order`; gate behind feature flag.
- Ship only after security review and encrypted secret storage.

## Definition of Done (per PR)
- Work must happen on a feature branch (e.g., `feature/stage4-execution`). Merge via PR only after review.
- Tests: `pnpm verify:mcp` + any new automated checks pass.
- Docs: README / AGENTS / CHANGELOG updated with new tools and usage.
- Safety: baseline tools untouched; `disableSse` remains true; structured outputs retain text summaries.

## Progress Log
- Stage 0–1 complete on `main` (tags `v1.0.0`, `v1.0.1`).
- Stage 2 merged in `c3536a4`.
- Stage 3 merged in `de08824` / `32bf9dd`.
- Future work (Stage 4+) must branch from latest `main` and follow the above PR process.
