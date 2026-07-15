"use client";
import { useState } from "react";
import { MonitorDown, X, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Where the compiled agent/dist/price-intel-agent.exe is hosted. The exe is
// ~140 MB, so it lives on GitHub Releases instead of the app bundle.
const AGENT_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_AGENT_DOWNLOAD_URL ||
  "https://github.com/95kodi/price-intel-dashboard/releases/latest/download/price-intel-agent.exe";

export function DownloadAgentButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MonitorDown size={14} />
        Scraper Agent
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Download scraper agent"
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-popover w-full max-w-md p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-base font-semibold text-gray-900">Desktop Scraper Agent</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-7 h-7 -mt-1 -mr-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Marketplaces block scans from cloud servers. The agent runs price scans from your own
              computer instead, where they aren&apos;t blocked, and updates this dashboard
              automatically.
            </p>

            <ol className="text-sm text-gray-700 space-y-2.5 mb-6 list-decimal list-inside">
              <li>Download and open the agent (Windows, ~85 MB).</li>
              <li>
                If Windows shows &quot;Windows protected your PC&quot;, click{" "}
                <span className="font-medium">More info → Run anyway</span>.
              </li>
              <li>The agent scans all products and saves prices — watch progress in its window.</li>
              <li>Chrome or Microsoft Edge must be installed (used invisibly for some sites).</li>
            </ol>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Close
              </Button>
              <a href={AGENT_DOWNLOAD_URL} className="flex-1" download>
                <Button variant="primary" className="w-full">
                  <Download size={14} />
                  Download for Windows
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
