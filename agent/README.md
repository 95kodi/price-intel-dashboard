# Price Intel Scraper Agent

A standalone Windows app that runs price scans from the user's own machine.
Marketplaces block datacenter IPs (Vercel etc.), but a home/office connection
is a residential IP, so scraping works — same reason it works on localhost.

The agent talks directly to the backend (`https://api.gogizmo.co`):
fetch active products → fetch each product's platform URLs → scrape with the
same scrapers as the dashboard (`../src/lib/scrapers`) → save prices with
`Source: "Desktop Agent"`.

Two builds share the same scan core (`src/scan.ts`):

- **Electron UI app** (`electron/`, `ui/`) — the one users download. A window
  with Start/Stop, progress bar, per-platform results, and a dry-run toggle.
- **Headless CLI** (`src/index.ts`) — for testing and unattended use.

## Build

```bash
cd agent
npm install
npm run build:app     # → release/price-intel-agent.exe  (Electron UI, ~85 MB)
npm run build:cli     # → dist/price-intel-agent.exe     (console version)
```

Requirements on the *user's* machine: Chrome or Edge installed (used headlessly
for browser-fetch platforms like Croma). Nothing else.

## Publish

Upload `release/price-intel-agent.exe` to a new GitHub release — keep the
asset name exactly `price-intel-agent.exe`; the dashboard's download button
points at `releases/latest/download/price-intel-agent.exe`.

## CLI usage

```
node dist/agent.cjs               scan (loops if intervalMinutes > 0 in config)
node dist/agent.cjs --once        single scan, then exit
node dist/agent.cjs --dry-run     scrape but don't save prices
node dist/agent.cjs --limit 2     only scan the first N products
```

## Config (optional)

`agent-config.json` next to the exe:

```json
{
  "apiBase": "https://api.gogizmo.co",
  "intervalMinutes": 60,
  "gatewayUrl": "",
  "proxyUrl": ""
}
```

`intervalMinutes` only affects the CLI loop; the UI app scans on demand.

## Notes

- Debug scraper logging: set `SCRAPER_DEBUG=1` in the environment.
- UI test hooks (used in CI/dev): `AGENT_UI_TEST=idle|scan`,
  `AGENT_UI_TEST_LIMIT=N`, `AGENT_UI_SHOT=path.png` — captures a screenshot
  and exits.
- The exe is unsigned, so Windows SmartScreen shows "Windows protected your
  PC" on first run — click **More info → Run anyway**. Code-signing removes
  this if it's ever distributed widely.
- `browsers.json` is copied from playwright-core at build time and packaged
  with the app — playwright's registry requires it at runtime.
