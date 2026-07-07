"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  startScan,
  cancelScan,
  resetScan,
  subscribeScan,
  getScanState,
  getInitialScanState,
} from "@/lib/scanManager";

export function ScanButton() {
  const [open, setOpen] = useState(false);
  const scan = useSyncExternalStore(subscribeScan, getScanState, getInitialScanState);
  const qc = useQueryClient();
  const { toast } = useToast();
  const prevStatus = useRef(scan.status);

  const isRunning = scan.status === "running";
  const isDone = scan.status === "done";
  const progress =
    scan.totalProducts > 0 ? Math.round((scan.productsDone / scan.totalProducts) * 100) : 0;

  // Refresh dashboard data once the background scan finishes,
  // even if the modal is hidden.
  useEffect(() => {
    if (prevStatus.current === "running" && scan.status === "done") {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-with-prices"] });
      qc.invalidateQueries({ queryKey: ["competitor-coverage"] });
      toast(
        scan.cancelled
          ? `Scan stopped — ${scan.succeeded} prices updated`
          : `Scan complete — ${scan.succeeded} prices updated${scan.failed ? `, ${scan.failed} failed` : ""}`,
        scan.failed > 0 ? "error" : "success"
      );
    }
    prevStatus.current = scan.status;
  }, [scan.status, scan.succeeded, scan.failed, scan.cancelled, qc, toast]);

  function handleClick() {
    if (!isRunning) {
      resetScan();
      void startScan();
    }
    setOpen(true);
  }

  return (
    <>
      <Button variant="primary" size="sm" onClick={handleClick}>
        {isRunning ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Scanning… {scan.totalProducts > 0 ? `${progress}%` : ""}
          </>
        ) : (
          "Run Price Scan"
        )}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Price scan progress"
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-popover w-full max-w-md p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-base font-semibold text-gray-900">
                {isRunning ? "Running Price Scan" : isDone ? (scan.cancelled ? "Scan Stopped" : "Scan Complete") : "Price Scan"}
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Hide progress"
                className="w-7 h-7 -mt-1 -mr-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              {isRunning
                ? scan.totalProducts > 0
                  ? `Product ${Math.min(scan.productsDone + 1, scan.totalProducts)} of ${scan.totalProducts}`
                  : "Loading product list..."
                : `${scan.succeeded} prices updated${scan.failed ? `, ${scan.failed} failed` : ""}`}
            </p>

            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${isDone && !scan.cancelled ? 100 : progress}%` }}
              />
            </div>

            {isRunning && scan.currentProduct && (
              <div className="flex items-center gap-2 text-sm text-gray-700 mb-4">
                <Loader2 size={13} className="animate-spin text-primary shrink-0" />
                <span className="truncate">
                  {scan.currentProduct}
                  {scan.currentPlatform ? ` — ${scan.currentPlatform}` : ""}
                </span>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm mb-4">
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <Check size={13} /> {scan.succeeded} updated
              </span>
              {scan.failed > 0 && (
                <span className="inline-flex items-center gap-1.5 text-red-600">
                  <AlertTriangle size={13} /> {scan.failed} failed
                </span>
              )}
            </div>

            {scan.failures.length > 0 && (
              <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50 mb-5">
                {scan.failures.map((f, i) => (
                  <div key={i} className="px-3 py-2 text-xs">
                    <span className="font-medium text-gray-800">{f.product}</span>
                    <span className="text-gray-400"> · {f.platform} — </span>
                    <span className="text-red-600">{f.error}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {isRunning ? (
                <>
                  <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                    Hide (keeps running)
                  </Button>
                  <Button variant="danger" className="flex-1" onClick={() => cancelScan()}>
                    Stop scan
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
