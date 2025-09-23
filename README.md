# crypto-mcp

A minimal Model Context Protocol (MCP) server deployed on Vercel for ChatGPT Developer Mode. The
baseline functionality (tag `v1.0.0`) exposes four core tools that allow ChatGPT to search for a
symbol, fetch 24h ticker data, retrieve candlestick data, and run a sample dice roll.

## Baseline tools

| Tool name                   | Description                                                            |
| --------------------------- | ---------------------------------------------------------------------- |
| `search`                    | Parses a symbol query (e.g. `BTCUSDT 1h`) and returns an ID for `fetch` |
| `fetch`                     | Returns Binance 24h ticker data for an ID produced by `search`          |
| `get_binance_klines`        | Retrieves recent candlestick data for a Binance spot symbol             |
| `get_binance_perp_klines`   | Retrieves USDⓈ-M perpetual (futures) candlestick data                   |
| `price_action_summary`     | Analyzes recent structure and returns S/R + breakout ideas               |
| `get_risk_policy`          | Returns the current in-memory risk policy                               |
| `set_risk_policy`          | Updates the risk policy (partial updates allowed)                        |
| `draft_order`              | Drafts a trade with RR + policy evaluation                              |
| `request_confirmation`     | Creates a confirmation ticket for manual approval                        |
| `get_confirmation`         | Retrieves a confirmation ticket by ID                                   |
| `list_confirmations`       | Lists all pending confirmations                                         |
| `roll_dice`                | Demonstration tool from the MCP starter template                        |

> **Important:** ChatGPT validates the presence of `search` and `fetch`. Do not remove or rename
> them; new tools should be added alongside these baseline ones.

## Requirements

- Node.js 20+
- pnpm 9+

## Getting started

```bash
pnpm install
pnpm dev
```

The development server listens on `http://localhost:3000`. You can inspect the MCP endpoint with:

```bash
curl -s http://localhost:3000/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}'
```

## Local verification

Before opening a pull request run the smoke test which builds the project, starts `next start` on a
random port, and executes the `search → fetch → get_binance_klines` flow.

```bash
pnpm verify:mcp
```

The CI workflow runs the same script on every push and pull request. The command fails if any of the
baseline tools are missing or return an error.

## Deploying to Vercel

1. Push your changes to GitHub.
2. Ensure the repository is linked to Vercel and that the build command is `pnpm install && pnpm build`.
3. After deployment, verify the public endpoint:
   ```bash
   curl -s https://<your-domain>/api/mcp \
     -H 'Content-Type: application/json' \
     -H 'Accept: application/json, text/event-stream' \
     -d '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}'
   ```
4. Add the MCP server in ChatGPT Developer Mode by specifying the full URL `https://<your-domain>/api/mcp`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution rules, including why the baseline tools and
SSE configuration must remain intact.

## Release Notes

Historical milestones and release tags are tracked in [docs/CHANGELOG.md](./docs/CHANGELOG.md).
