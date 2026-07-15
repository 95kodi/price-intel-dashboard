/**
 * Price Intel scraper agent — CLI entry.
 *
 * Runs on a user's own machine (residential IP) so marketplace bot
 * protection that blocks datacenter hosts doesn't apply. The Electron UI
 * (electron/main.ts) is the primary distribution; this CLI is kept for
 * headless use and quick testing.
 *
 * Usage:
 *   agent.cjs               run a scan (loops if intervalMinutes > 0)
 *   agent.cjs --once        run a single scan and exit
 *   agent.cjs --dry-run     scrape but don't save prices
 *   agent.cjs --limit 2     only scan the first N products
 */
import * as path from "path";
import * as readline from "readline";
import { loadConfig, runScan, ScanTotals } from "./scan";

// Compiled exes (pkg) put __dirname inside the snapshot; the config file
// lives next to the exe instead.
function baseDir(): string {
  return (process as NodeJS.Process & { pkg?: unknown }).pkg
    ? path.dirname(process.execPath)
    : process.cwd();
}

interface CliArgs {
  dryRun: boolean;
  once: boolean;
  limit: number;
}

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2);
  const limitIdx = argv.indexOf("--limit");
  return {
    dryRun: argv.includes("--dry-run"),
    once: argv.includes("--once"),
    limit: limitIdx >= 0 ? Number(argv[limitIdx + 1]) || 0 : 0,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function printSummary(totals: ScanTotals) {
  console.log("\n================ Scan summary ================");
  console.log(`URLs scanned : ${totals.scanned}`);
  console.log(`Succeeded    : ${totals.succeeded}`);
  console.log(`Failed       : ${totals.failed}`);
  if (totals.failures.length > 0) {
    console.log("Failures:");
    for (const f of totals.failures) {
      console.log(`  - ${f.product} / ${f.platform}: ${f.error}`);
    }
  }
  console.log("==============================================\n");
}

/** Keeps the console window open when the exe was double-clicked. */
function waitForEnter(message: string): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  const args = parseArgs();
  const config = loadConfig(baseDir());

  console.log("Price Intel scraper agent");
  console.log(`Backend: ${config.apiBase}`);
  if (args.dryRun) console.log("Mode: DRY RUN (prices will not be saved)");
  console.log("");

  const loop = !args.once && config.intervalMinutes > 0;

  do {
    const started = Date.now();
    try {
      const totals = await runScan(
        config,
        { dryRun: args.dryRun, limit: args.limit },
        {
          onStart: (total) => console.log(`${total} active product(s) to scan.\n`),
          onProduct: (i, total, name) => console.log(`[${i + 1}/${total}] ${name}`),
          onResult: (r) =>
            console.log(
              r.ok
                ? `  ${r.platform}: ₹${r.price}${args.dryRun ? " (dry run — not saved)" : " saved"}`
                : `  ${r.platform}: FAILED — ${r.error}`
            ),
        }
      );
      printSummary(totals);
    } catch (err) {
      console.error(`Scan failed: ${(err as Error).message}`);
    }

    if (loop) {
      const elapsedMin = (Date.now() - started) / 60_000;
      const waitMin = Math.max(config.intervalMinutes - elapsedMin, 1);
      const next = new Date(Date.now() + waitMin * 60_000);
      console.log(`Next scan at ${next.toLocaleTimeString()} (every ${config.intervalMinutes} min). Ctrl+C to stop.`);
      await sleep(waitMin * 60_000);
    }
  } while (loop);

  await waitForEnter("Done. Press Enter to exit...");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
