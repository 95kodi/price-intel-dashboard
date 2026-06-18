"use client";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useRunScan } from "@/hooks/useQueries";
import { Button } from "@/components/ui/Button";

const SCAN_STEPS = [
  "Connecting to Amazon...",
  "Scanning Flipkart...",
  "Checking Poorvika...",
  "Fetching Reliance Digital...",
  "Scanning Croma...",
  "Finalizing results...",
];

export function ScanButton() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const scanMutation = useRunScan();

  function startScan() {
    setOpen(true);
    setCurrentStep(0);
    scanMutation.mutate();

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      setCurrentStep(step);
      if (step >= SCAN_STEPS.length) clearInterval(interval);
    }, 500);
  }

  const isComplete = currentStep >= SCAN_STEPS.length && scanMutation.isSuccess;

  return (
    <>
      <Button variant="primary" size="sm" onClick={startScan}>
        <Loader2 size={14} className={scanMutation.isPending ? "animate-spin" : "hidden"} />
        Run Price Scan
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => isComplete && setOpen(false)}>
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              {isComplete ? "Scan Complete" : "Running Price Scan"}
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              {isComplete ? "42 products updated. Found 3 price changes." : "Scanning 42 products across 6 competitors..."}
            </p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-5">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((currentStep / SCAN_STEPS.length) * 100, 100)}%` }}
              />
            </div>
            <div className="text-left space-y-1.5 mb-5">
              {SCAN_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-2 text-sm">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      i < currentStep ? "bg-green-100 text-green-600" : i === currentStep ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {i < currentStep ? <Check size={11} /> : i === currentStep ? <Loader2 size={11} className="animate-spin" /> : <span className="w-1 h-1 rounded-full bg-current" />}
                  </div>
                  <span className={i <= currentStep ? "text-gray-900" : "text-gray-400"}>{step}</span>
                </div>
              ))}
            </div>
            {isComplete && (
              <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
                Close
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
