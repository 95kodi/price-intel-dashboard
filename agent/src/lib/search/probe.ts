/**
 * Manual probe: search one store and show what pickBestHit chooses.
 *
 *   node probe.cjs "<store>" "<query>" [brand] [model]
 *
 * brand defaults to the query's first word, model to the query. Store "all"
 * runs every searcher. Set SEARCH_FORCE_BROWSER=1 to exercise the browser path.
 */
import { BlockedError } from "../http";
import { SEARCH_PLATFORMS, getSearcher, needsBrowser, pickBestHit } from "./index";

const fmt = (n: number | null) => (n === null ? "-" : `₹${n.toLocaleString("en-IN")}`);

async function probe(store: string, query: string, brand: string, model: string): Promise<void> {
  const searcher = getSearcher(store);
  if (!searcher) throw new Error(`No searcher for "${store}". Known: ${SEARCH_PLATFORMS.join(", ")}`);
  console.log(`\n=== ${store} — "${query}"${needsBrowser(store) ? " (may use browser)" : ""}`);
  const t = Date.now();
  try {
    const hits = await searcher.search(query);
    console.log(`${hits.length} hits in ${Date.now() - t} ms`);
    hits.forEach((h, i) =>
      console.log(
        `${String(i + 1).padStart(2)}. ${fmt(h.price).padEnd(10)} mrp ${fmt(h.mrp).padEnd(10)}` +
          `${h.inStock === false ? " [OOS]" : ""} ${h.title}\n      ${h.url}`
      )
    );
    const best = pickBestHit(model, brand, hits);
    console.log(best ? `MATCH: ${fmt(best.price)}  ${best.title}\n       ${best.url}` : "MATCH: none");
  } catch (err) {
    const kind = err instanceof BlockedError ? "BLOCKED" : "ERROR";
    console.log(`${kind} after ${Date.now() - t} ms: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

(async () => {
  const [store, query, brandArg, modelArg] = process.argv.slice(2);
  if (!store || !query) {
    console.log('Usage: node probe.cjs "<store|all>" "<query>" [brand] [model]');
    process.exit(2);
  }
  const brand = brandArg ?? query.split(/\s+/)[0];
  const model = modelArg ?? query;
  const stores = store === "all" ? SEARCH_PLATFORMS : [store];
  for (const [i, s] of stores.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1500)); // be polite
    await probe(s, query, brand, model);
  }
})();
