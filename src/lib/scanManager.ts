"use client";
import { fetchProducts } from "@/services/api";
import { getProductPlatformUrls } from "@/services/productPlatformUrlService";

export interface ScanFailure {
  product: string;
  platform: string;
  error: string;
}

export interface ScanState {
  status: "idle" | "running" | "done";
  totalProducts: number;
  productsDone: number;
  currentProduct: string | null;
  currentPlatform: string | null;
  urlsScanned: number;
  succeeded: number;
  failed: number;
  failures: ScanFailure[];
  cancelled: boolean;
  startedAt: number | null;
  finishedAt: number | null;
}

export const INITIAL_SCAN_STATE: ScanState = {
  status: "idle",
  totalProducts: 0,
  productsDone: 0,
  currentProduct: null,
  currentPlatform: null,
  urlsScanned: 0,
  succeeded: 0,
  failed: 0,
  failures: [],
  cancelled: false,
  startedAt: null,
  finishedAt: null,
};

// Module-level singleton so the scan keeps running while the user
// navigates between pages (a full page reload does stop it).
let state: ScanState = INITIAL_SCAN_STATE;
let cancelRequested = false;
const listeners = new Set<() => void>();

function setState(patch: Partial<ScanState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeScan(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getScanState(): ScanState {
  return state;
}

export function getInitialScanState(): ScanState {
  return INITIAL_SCAN_STATE;
}

export function cancelScan() {
  cancelRequested = true;
}

export function resetScan() {
  if (state.status === "running") return;
  state = INITIAL_SCAN_STATE;
  listeners.forEach((l) => l());
}

async function scrapeOne(url: string, platform: string, productPlatformId: number): Promise<void> {
  const res = await fetch("/api/scrape-price", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, platform, productPlatformId }),
  });
  const data = await res.json().catch(() => null);
  if (!data?.success) {
    throw new Error(data?.error || `Scrape failed (HTTP ${res.status})`);
  }
}

export async function startScan(): Promise<void> {
  if (state.status === "running") return;
  cancelRequested = false;
  setState({ ...INITIAL_SCAN_STATE, status: "running", startedAt: Date.now() });

  try {
    const products = (await fetchProducts()).filter((p) => p.IsActive);
    setState({ totalProducts: products.length });

    for (const product of products) {
      if (cancelRequested) break;
      setState({ currentProduct: product.ItemName, currentPlatform: null });

      try {
        const res = await getProductPlatformUrls(product.ProductID);
        const platforms = (res.Platforms ?? []).filter((p) => p.ProductURL);

        for (const p of platforms) {
          if (cancelRequested) break;
          setState({ currentPlatform: p.PlatformName });
          try {
            await scrapeOne(p.ProductURL, p.PlatformName, p.ProductPlatformID);
            setState({ urlsScanned: state.urlsScanned + 1, succeeded: state.succeeded + 1 });
          } catch (err) {
            setState({
              urlsScanned: state.urlsScanned + 1,
              failed: state.failed + 1,
              failures: [
                ...state.failures,
                {
                  product: product.ItemName,
                  platform: p.PlatformName,
                  error: err instanceof Error ? err.message : "Failed",
                },
              ],
            });
          }
        }
      } catch (err) {
        setState({
          failed: state.failed + 1,
          failures: [
            ...state.failures,
            {
              product: product.ItemName,
              platform: "—",
              error: err instanceof Error ? err.message : "Couldn't load product URLs",
            },
          ],
        });
      }

      setState({ productsDone: state.productsDone + 1 });
    }
  } catch (err) {
    setState({
      failures: [
        ...state.failures,
        { product: "—", platform: "—", error: err instanceof Error ? err.message : "Couldn't load products" },
      ],
    });
  } finally {
    setState({
      status: "done",
      currentProduct: null,
      currentPlatform: null,
      cancelled: cancelRequested,
      finishedAt: Date.now(),
    });
  }
}
