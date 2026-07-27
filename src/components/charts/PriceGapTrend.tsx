"use client";
import { LineChart } from "lucide-react";
import { ChartCard, AwaitingData } from "./ChartCard";

/**
 * Intentionally renders no line.
 *
 * The 7-day trend needs a timestamped price series. `GET /price-history/product/{id}`
 * answers "No Price History Found" for every product, and no response schema in
 * the API exposes a capture time, so there is nothing to plot. Inventing a
 * plausible curve here would put a fabricated trend in front of someone making
 * repricing decisions, so the widget states the gap instead.
 *
 * To light this up: have the API return CaptureTime on price history, then
 * aggregate mean signed gap per day over the window.
 */
export function PriceGapTrend() {
  return (
    <ChartCard
      title="Price Gap Trend"
      question="Are we closing the gap on the market, or falling behind?"
    >
      {() => (
        <AwaitingData
          icon={LineChart}
          headline="Awaiting scan history"
          detail="The trend needs timestamped price snapshots. The price-history endpoint currently returns no records, so there is no series to plot yet."
          requires="GET /price-history/product/{id} → CaptureTime"
        />
      )}
    </ChartCard>
  );
}
